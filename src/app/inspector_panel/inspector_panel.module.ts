import {ScrollingModule} from '@angular/cdk/scrolling';
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatDividerModule} from '@angular/material/divider';

import {InspectorPanel} from './inspector_panel.component';

@NgModule({
  imports: [
    CommonModule,
    MatDividerModule,
    ScrollingModule,
  ],
  declarations: [InspectorPanel],
  exports: [InspectorPanel],
})
export class InspectorPanelModule {
}
