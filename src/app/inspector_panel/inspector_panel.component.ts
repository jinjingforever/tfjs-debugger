import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';

import {Backend, ModelGraphNode, OverviewStats} from '../common/types';
import {AppService} from '../services/app_service';

interface DataValueItem {
  value1: number;
  value2: number;
  diff: number;
}

const BAD_THRESHOLD = 0.05;

@Component({
  selector: 'inspector-panel',
  templateUrl: './inspector_panel.component.html',
  styleUrls: ['./inspector_panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectorPanel implements OnInit {
  curOverviewStats?: OverviewStats;
  curSelectedNode?: ModelGraphNode;
  curDataValueItems: DataValueItem[] = [];
  curBackends: Backend[] = [];

  constructor(
      private readonly appService: AppService,
      private readonly changeDetectionRef: ChangeDetectorRef) {}

  ngOnInit() {
    this.appService.overviewStats.subscribe(stats => {
      this.curOverviewStats = stats;
      this.changeDetectionRef.markForCheck();
    });

    this.appService.runResult.subscribe(result => {
      this.curBackends = result.backends;
      this.changeDetectionRef.markForCheck();
    });

    this.appService.selectedNode.subscribe(node => {
      this.curSelectedNode = node;

      this.curDataValueItems = [];
      if (this.curSelectedNode && this.curSelectedNode.result &&
          this.curSelectedNode.result.data1 &&
          this.curSelectedNode.result.data2) {
        for (let i = 0; i < this.curSelectedNode.result.data1.values.length;
             i++) {
          const value1 = this.curSelectedNode.result.data1.values[i];
          const value2 = this.curSelectedNode.result.data2.values[i];
          const diff = (value1 - value2) / value2;
          this.curDataValueItems.push({
            value1,
            value2,
            diff,
          });
        }
      }
      this.changeDetectionRef.markForCheck();
    });
  }

  get selectedNodeName(): string {
    return this.curSelectedNode?.id?.trim() || 'Unknown';
  }

  get selectedNodeShape(): string {
    return `[${this.curSelectedNode?.result?.shape?.join(', ') || ''}]`;
  }

  get selectedNodeInputs(): ModelGraphNode[] {
    return this.curSelectedNode?.inputs || [];
  }

  get isSelectedNodeDiffBad(): boolean {
    return (this.curSelectedNode?.result?.diff || 0) > BAD_THRESHOLD;
  }

  get selectedNodeDiffPct(): string {
    const diff = this.curSelectedNode?.result?.diff || 0;
    return `${(diff * 100).toFixed(2)}%`;
  }

  getInputShape(inputNode: ModelGraphNode): string {
    return `[${inputNode.result?.shape?.join(', ') || ''}]`;
  }

  getDataValueDiff(item: DataValueItem): string {
    return `${(item.diff * 100).toFixed(2)}%`;
  }

  isDataValueBad(item: DataValueItem): boolean {
    return Math.abs(item.diff) > BAD_THRESHOLD;
  }
}
