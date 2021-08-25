import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-wasm';
import '@tensorflow/tfjs-backend-cpu';

import {enableProdMode} from '@angular/core';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import * as tfwasm from '@tensorflow/tfjs-backend-wasm';

import {AppModule} from './app/app.module';
import {environment} from './environments/environment';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule).catch(
    err => console.error(err));

tfwasm.setWasmPaths(
    'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm/dist/');
