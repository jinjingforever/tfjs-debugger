import {TypedArray} from 'd3';

export interface RunConfig {
  backend: string;
}

export interface Backend {
  name: string
  label: string;
}

export interface ModelGraphNode {
  id: string;
  op: string;
  width: number;
  height: number;
  attributes: {};
  inputs: ModelGraphNode[];
  result?: ResultEntry;
  // name: string;
  // parentIds?: string[];
  // size: [number, number];
  // children: ModelGraphNode[];
}

export interface RunResult {
  backends: Backend[];
  modelJson: ModelJson;
  results: {[nodeName: string]: ResultEntry};
}

export declare interface ModelJson {
  modelTopology: ModelTopology;
}

export declare interface ModelTopology {
  node: ModelNode[];
}

export declare interface ModelNode {
  name: string;
  op: string;
  input: string[];
  attr: {};
}

export interface ResultEntry {
  data1?: TensorData;
  data2?: TensorData;
  diff?: number;
  shape?: number[];
}

export interface TensorData {
  values: TypedArray;
  shape: number[];
}

export interface OverviewStats {
  totalNodesCount: number;
  badNodesCount: number;
}
