import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatButtonModule} from '@angular/material/button'
import {MatInputModule} from '@angular/material/input'
import {MatSelectModule} from '@angular/material/select';

import {ConfigPanel} from './config_panel.component';

@NgModule({
  imports: [
    CommonModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
  ],
  declarations: [ConfigPanel],
  exports: [ConfigPanel],
})
export class ConfigPanelModule {
}
