import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {AppComponent} from './app.component';
import {ConfigPanelModule} from './config_panel/config_panel.module';
import {InspectorPanelModule} from './inspector_panel/inspector_panel.module';
import {ModelGraphModule} from './model_graph/model_graph.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    ConfigPanelModule,
    InspectorPanelModule,
    ModelGraphModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
