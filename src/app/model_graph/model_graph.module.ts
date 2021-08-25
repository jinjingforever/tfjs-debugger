import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';

import {ModelGraph} from './model_graph.component';

@NgModule({
  imports: [CommonModule],
  declarations: [ModelGraph],
  exports: [ModelGraph],
})
export class ModelGraphModule {
}
