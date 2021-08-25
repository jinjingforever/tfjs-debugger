import {AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import * as d3 from 'd3';
import * as dagre from 'dagre';

import {ModelGraphNode, ModelNode, RunResult} from '../common/types';
import {AppService} from '../services/app_service';

type D3Selection =
    d3.Selection<SVGGElement, dagre.Node<ModelGraphNode>, d3.BaseType, unknown>;

const OP_NODE_HEIGHT = 60;
const NODE_LABEL_HEIGHT = 24;
const NODE_LABEL_PADDING = 10;
const NODE_RECT_CORNER_RADIUS = 8;
const LINK_COLOR = '#bbb';
const DIFF_LOWER_BOUND = 0.1;
const DIFF_UPPER_BOUND = 0.5;
const MIN_ZOOM_FIT_SCALE = 0.8;

@Component({
  selector: 'model-graph',
  templateUrl: './model_graph.component.html',
  styleUrls: ['./model_graph.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelGraph implements OnInit, AfterViewInit {
  // @ViewChild('container', {static: false}) container!: ElementRef;
  @ViewChild('root', {static: true}) root!: ElementRef;

  curRunningStatus = '';
  curRunResult?: RunResult;
  showGraph = false;
  curTotalNodesCount = 0;
  curBadNodesCount = 0;

  private graph!: dagre.graphlib.Graph<ModelGraphNode>;
  private line = d3.linkVertical().x(d => (d as any).x).y(d => (d as any).y);
  private zoom = d3.zoom();
  private ctx = document.createElement('canvas').getContext('2d')!;
  private curScale = 1;
  private curTranslateX = 0;
  private curTranslateY = 0;
  private curSelectedNode?: ModelGraphNode;

  constructor(
      private readonly appService: AppService,
      private readonly changeDetectionRef: ChangeDetectorRef) {}

  ngOnInit() {
    this.appService.runResult.subscribe(runResult => {
      this.curRunResult = runResult;
      this.changeDetectionRef.markForCheck();
      setTimeout(() => {
        this.renderModelGraph();
      });
    });

    this.appService.runningStatus.subscribe(status => {
      this.curRunningStatus = status;
      this.changeDetectionRef.markForCheck();
    });

    this.appService.selectedNode.subscribe(node => {
      if (this.curSelectedNode) {
        const nodeContainer =
            document.querySelector(`[data-id="${this.curSelectedNode.id}"]`);
        if (nodeContainer) {
          nodeContainer.classList.remove('selected');
        }
      }
      if (node) {
        const nodeContainer = document.querySelector(`[data-id="${node.id}"]`);
        if (nodeContainer) {
          nodeContainer.classList.add('selected');
        }
      }
      this.curSelectedNode = node;
    });
  }

  ngAfterViewInit() {
    const g = d3.select(this.root.nativeElement)
                  .on('click',
                      () => {
                        // Click on empty space to deselect.
                        this.appService.selectedNode.next(undefined);
                      })
                  .append('g');

    d3.select(this.root.nativeElement)
        .append('defs')
        .append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', `0, 0, 20, 20`)
        .attr('refX', 12)
        .attr('refY', 6)
        .attr('markerWidth', 10)
        .attr('markerHeight', 10)
        .attr('orient', 'auto-start-reverse')
        .append('path')
        .attr('d', 'M0,0L0,12L12,6')
        .attr('fill', LINK_COLOR);

    // Setup drag and zoom
    this.zoom.scaleExtent([0.02, 10]).on('zoom', (event) => {
      g.attr('transform', event.transform);
      this.handleZoomChanged(event);
    });
    d3.select(this.root.nativeElement).call(this.zoom);
  }

  private update() {
    const g = d3.select(this.root.nativeElement).select('g');

    const nodes = this.graph.nodes().map(nodeId => this.graph.node(nodeId));
    console.log(nodes.length);
    console.log(nodes);
    const node =
        g.selectAll<SVGPathElement, dagre.Node<ModelGraphNode>>('g.node').data(
            nodes);
    const nodeEnter = node.enter()
                          .append('g')
                          .classed(
                              'node-group-with-data',
                              d => this.curRunResult!.results[d.id] != null)
                          .classed('const-node', d => d.op === 'Const')
                          .attr('transform', d => this.getNodeTransform(d))
                          .attr('data-op', d => d.op)
                          .attr('data-id', d => d.id)
                          .on('click', (e, d) => {
                            e.stopPropagation();

                            const result = this.curRunResult!.results[d.id];
                            console.log(d);
                            console.log(result);
                            this.appService.selectedNode.next(d);
                          });
    this.genNodeRect(nodeEnter);

    const links = this.graph.edges();
    const link =
        g.selectAll<SVGPathElement, dagre.Edge>('path.link').data(links);
    const linkEnter =
        link.enter()
            .insert('path', 'g')
            .classed('link', true)
            .attr(
                'd',
                d => {
                  const fromNode = this.graph.node(d.v);
                  const toNode = this.graph.node(d.w);
                  const fromNodeHigher = fromNode.y <= toNode.y;
                  return this.line({
                    source: {
                      x: fromNode.x,
                      y: fromNodeHigher ? fromNode.y + fromNode.height / 2 :
                                          fromNode.y - fromNode.height / 2,
                    },
                    target: {
                      x: toNode.x,
                      y: fromNodeHigher ? toNode.y - toNode.height / 2 :
                                          toNode.y + toNode.height / 2,
                    }
                  } as any);
                })
            .attr('stroke', LINK_COLOR)
            .attr('marker-end', 'url(#arrow)');
  }

  private renderModelGraph() {
    if (!this.curRunResult) return;

    const graphDataMap: {[name: string]: ModelGraphNode} = {};
    this.graph = new dagre.graphlib.Graph<ModelGraphNode>();
    this.graph.setGraph({nodesep: 10});
    this.graph.setDefaultEdgeLabel(() => {
      return {};
    });

    // Add all nodes.
    const seenNames = new Set<string>();
    const modelNodes = this.curRunResult.modelJson.modelTopology.node;
    this.curTotalNodesCount = modelNodes.length;
    for (const node of modelNodes) {
      // if (node.op === 'Const') {
      //   continue;
      // }
      seenNames.add(node.name);
      const graphNode: ModelGraphNode = {
        id: node.name,
        op: node.op,
        width: this.getRoundedTextWidth(node.op) + NODE_LABEL_PADDING * 2,
        height: this.getNodeHeight(node),
        attributes: node.attr,
        inputs: [],
        result: this.curRunResult.results[node.name],
      };
      this.graph.setNode(node.name, graphNode);
      graphDataMap[node.name] = graphNode;
    }

    // Add all links.
    for (const node of modelNodes) {
      if (!seenNames.has(node.name)) {
        continue;
      }
      if (node.input) {
        const parentIds: string[] =
            node.input.filter(curInput => graphDataMap[curInput]);
        const graphNode = graphDataMap[node.name];
        if (graphNode) {
          for (const parentId of parentIds) {
            this.graph.setEdge(parentId, graphNode.id);
            const parentNode = graphDataMap[parentId];
            if (parentNode) {
              graphNode.inputs.push(parentNode);
            }
          }
        }
      }
    }
    dagre.layout(this.graph);
    console.log('done');

    // Find the highest node with bad result.
    this.curBadNodesCount = 0;
    const nodes = this.graph.nodes().map(nodeId => this.graph.node(nodeId));
    let minY: number|undefined = undefined;
    for (const node of nodes) {
      const level = this.getDiffLevel(node);
      if (level < 0) continue;
      this.curBadNodesCount++;
      if (minY === undefined || node.y < minY) {
        minY = node.y;
      }
    }
    if (minY === undefined) {
      minY = 0;
    }

    this.appService.overviewStats.next({
      totalNodesCount: this.curTotalNodesCount,
      badNodesCount: this.curBadNodesCount,
    });

    this.update();
    this.showGraph = true;
    this.changeDetectionRef.markForCheck();
    setTimeout(() => {
      this.zoomFit(minY!, 0.9, 0);
    });
  }

  private getNodeHeight(node: ModelNode): number {
    if (node.op === 'Const') {
      return NODE_LABEL_HEIGHT;
    }
    return OP_NODE_HEIGHT;
  }


  private getNodeTransform(d: dagre.Node<ModelGraphNode>): string {
    const x = d.x - d.width / 2;
    const y = d.y - d.height / 2;
    return `translate(${x}, ${y})`;
  }

  private genNodeRect(selection: D3Selection): D3Selection {
    selection.append('rect')
        .classed('node-bg', true)
        .attr('width', d => d.width)
        .attr('height', d => d.height)
        .attr('rx', NODE_RECT_CORNER_RADIUS);
    selection.append('rect')
        .classed('node-error-bg', true)
        .attr('width', d => d.width)
        .attr('height', d => d.height)
        .attr('rx', NODE_RECT_CORNER_RADIUS)
        .attr('fill', d => {
          const level = this.getDiffLevel(d);
          if (level < 0) {
            return 'white';
          }
          return `rgba(170, 0, 0, ${level}`;
        });
    selection.append('clipPath')
        .attr('id', d => `node-op-clip-${d.id}`)
        .append('rect')
        .attr('width', d => d.width)
        .attr(
            'height',
            d => d.op === 'Const' ? NODE_LABEL_HEIGHT : NODE_LABEL_HEIGHT + 10)
        .attr('rx', NODE_RECT_CORNER_RADIUS);
    selection.append('rect')
        .classed('node-op-bg', true)
        .attr('clip-path', d => `url(#node-op-clip-${d.id})`)
        .attr('width', d => d.width)
        .attr('height', NODE_LABEL_HEIGHT);
    selection.append('text')
        .classed('node-op', true)
        .attr('x', 8)
        .attr('y', NODE_LABEL_HEIGHT / 2 + 1)
        .text(d => d.op);
    selection.append('text')
        .classed('node-diff', true)
        .attr('x', 8)
        .attr('y', NODE_LABEL_HEIGHT + 8)
        .attr(
            'fill',
            d => {
              const level = this.getDiffLevel(d);
              if (level < 0) {
                return '#aaa';
              }
              if (level > 0.5) {
                return 'white';
              }
              return 'black';
            })
        .text(d => {
          const result = this.curRunResult!.results[d.id];
          if (result) {
            return `${((result.diff || 0) * 100).toFixed(2)}%`;
          }
          return '';
        });
    selection.append('path')
        .classed('node-op-separator', true)
        .attr(
            'd',
            d => `M0, ${NODE_LABEL_HEIGHT} L${d.width}, ${NODE_LABEL_HEIGHT}`);
    selection.append('rect')
        .classed('node-border', true)
        .attr('width', d => d.width)
        .attr('height', d => d.height)
        .attr('rx', NODE_RECT_CORNER_RADIUS);
    return selection;
  }

  private getRoundedTextWidth(text: string, fontSize = 13): number {
    this.ctx.font = `${fontSize}px 'Google Sans'`;
    return Math.ceil(this.ctx.measureText(text).width / 40) * 40;
  }

  private getDiffLevel(d: dagre.Node<ModelGraphNode>): number {
    const result = this.curRunResult!.results[d.id];
    if (result) {
      const diff = result.diff || 0;
      if (diff > DIFF_LOWER_BOUND) {
        return (diff - DIFF_LOWER_BOUND) /
            (DIFF_UPPER_BOUND - DIFF_LOWER_BOUND);
      }
    }
    return -1;
  }

  private handleZoomChanged(e: any) {
    if (e.transform) {
      this.curScale = e.transform.k;
      this.curTranslateX = e.transform.x;
      this.curTranslateY = e.transform.y;
    }
  }

  private zoomFit(
      targetY: number, paddingPercent = 0.9, transitionDuration = 300) {
    const svg = this.root.nativeElement as SVGAElement;
    if (!svg) return;

    const bounds = svg.getBBox();
    const parent = svg.parentElement;
    if (!parent) return;

    const fullWidth = parent.clientWidth;
    const fullHeight = parent.clientHeight;
    const width = bounds.width;
    const height = bounds.height;
    const midX = bounds.x + width / 2;
    const midY = bounds.y + height / 2;
    if (width === 0 || height === 0) return;  // nothing to fit


    // let scale =
    //     paddingPercent / Math.max(width / fullWidth, height / fullHeight);
    const scale = MIN_ZOOM_FIT_SCALE;
    const translate = [
      fullWidth / 2 - scale * (midX - this.curTranslateX),
      fullHeight / 2 -
          scale * (Math.max(targetY, fullHeight / 2) - this.curTranslateY)
    ];
    const transform = d3.zoomIdentity.translate(translate[0], translate[1])
                          .scale(scale * this.curScale);
    d3.select(svg)
        .transition()
        .duration(transitionDuration)  // milliseconds
        .call(this.zoom.transform as any, transform);
  }
}
