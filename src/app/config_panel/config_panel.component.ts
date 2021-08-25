import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import * as tfconv from '@tensorflow/tfjs-converter';
import * as tf from '@tensorflow/tfjs-core';
import {Tensor} from '@tensorflow/tfjs-core';

import {Backend, ModelJson, ModelNode, ResultEntry} from '../common/types';
import {AppService} from '../services/app_service';

@Component({
  selector: 'config-panel',
  templateUrl: './config_panel.component.html',
  styleUrls: ['./config_panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigPanel implements OnInit {
  readonly backends: Backend[] = [
    {name: 'cpu', label: 'CPU'},
    {name: 'webgl', label: 'WebGL'},
    {name: 'wasm', label: 'WASM'},
  ];

  curModelUrl = 'assets/model/model.json';
  curSelectedBackend1: Backend = this.backends[1];
  curSelectedBackend2: Backend = this.backends[2];

  constructor(private readonly appService: AppService) {}

  ngOnInit() {}

  handleModelUrlChanged(curModelUrl: string) {
    this.curModelUrl = curModelUrl;
  }

  handleClickStartButton() {
    this.runModelAndCollectData();
  }

  get isStartButtonDisabled(): boolean {
    return this.curModelUrl === '';
  }

  private async runModelAndCollectData() {
    // Prepare input image.
    const img = new Image();
    img.src = 'assets/template.png';
    img.onload = async () => {
      // Pre-process.
      let imgData = tf.browser.fromPixels(img, 3);
      imgData = tf.div(tf.sub(tf.div(imgData, 255), 0.5), 0.5);
      imgData = tf.expandDims(tf.transpose(imgData, [2, 0, 1]), 0);

      // Get node names. Exclude all the condition nodes.
      const modelJson =
          await (await fetch(this.curModelUrl)).json() as ModelJson;

      const nodes = modelJson.modelTopology.node as ModelNode[];
      const nodeNames =
          nodes.map(node => node.name).filter(name => !name.includes('/cond'));
      // console.log(nodeNames);

      // Final result.
      const results: {[nodeName: string]: ResultEntry} = {};

      // Run config 1.
      this.appService.runningStatus.next(
          `Running model in ${this.curSelectedBackend1.label} backend...`);
      await tf.setBackend(this.curSelectedBackend1.name);
      const model = await tfconv.loadGraphModel(this.curModelUrl);
      // console.log(model.inputs[0].shape);
      // console.log(model.outputNodes[0]);
      // const inputTensor =
      //     tf.rand(model.inputs[0].shape!, () => tf.util.randUniform(0, 1));
      const outs = await model.executeAsync(imgData, nodeNames);
      const outsArray = outs as Tensor[];
      for (let i = 0; i < outsArray.length; i++) {
        const nodeName = nodeNames[i];
        const tensor = outsArray[i];
        if (!results[nodeName]) {
          results[nodeName] = {};
        }
        // Extract tensor data.
        const values = tensor.dataSync();
        const shape = tensor.shape;
        results[nodeName].data1 = {values, shape};
        results[nodeName].shape = tensor.shape;
      }

      // Run config 2.
      this.appService.runningStatus.next(
          `Running model in ${this.curSelectedBackend2.label} backend...`);
      await new Promise<void>(
          resolve => {setTimeout(async () => {
            await tf.setBackend(this.curSelectedBackend2.name);
            const outs2 = await model.executeAsync(imgData, nodeNames);
            const outsArray2 = outs2 as Tensor[];
            for (let i = 0; i < outsArray2.length; i++) {
              const nodeName = nodeNames[i];
              const tensor = outsArray2[i];
              if (!results[nodeName]) {
                results[nodeName] = {};
              }
              // Extract tensor data.
              const values = tensor.dataSync();
              const shape = tensor.shape;
              results[nodeName].data2 = {values, shape};
            }
            resolve();
          })});

      // Calculate diffs.
      this.appService.runningStatus.next('Processing results...');
      for (const name in results) {
        const entry = results[name];
        if (!entry.data1 || !entry.data2) {
          console.warn(`Data missing for node ${name}`);
          continue;
        }
        const data1 = entry.data1!;
        const data2 = entry.data2!;
        let sum = 0;
        let sumDiff = 0;
        for (let i = 0; i < data1.values.length; i++) {
          sum += Math.abs(data2.values[i]);
          sumDiff += Math.abs(data2.values[i] - data1.values[i]);
        }
        sum /= data2.values.length;
        sumDiff /= data2.values.length;
        entry.diff = sumDiff / sum;

        // console.log(`${name}: ${entry.diff}`);
      }

      this.appService.runResult.next({
        modelJson,
        results,
        backends: [this.curSelectedBackend1, this.curSelectedBackend2],
      });

      // console.log(results);
    };
  }
}
