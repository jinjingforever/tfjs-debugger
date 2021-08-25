import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';

import {Backend, ModelGraphNode, OverviewStats, RunConfig, RunResult} from '../common/types';

@Injectable({
  providedIn: 'root',
})
export class AppService {
  backends = new Subject<Backend[]>();

  /** Status message.  */
  runningStatus = new Subject<string>();

  /** The final result. */
  runResult = new Subject<RunResult>();

  overviewStats = new Subject<OverviewStats>();

  selectedNode = new Subject<ModelGraphNode|undefined>();
}
