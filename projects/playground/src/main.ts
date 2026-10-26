import { bootstrapApplication } from '@angular/platform-browser';
import { JuicebarComponent } from '@juicejs/juicebar';
import { appConfig } from './app/app.config';

bootstrapApplication(JuicebarComponent, appConfig)
  .catch(err => console.error(err));
