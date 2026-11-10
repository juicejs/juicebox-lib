import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {USERS_CUSTOMIZATION, UsersCustomization} from '../../../../config/base-app.config';
import {provideJuicebarTesting, signInTestUser} from '../../../../../testing/juicebar-testing';
import {UserTranslationPipe} from '../i18n/user.translation';
import {UserWizardComponent} from './user-wizard.component';

@Component({template: ''})
class StepComponent {}

describe('UserWizardComponent', () => {
  async function open(url: string, customization: UsersCustomization = {}) {
    TestBed.configureTestingModule({
      providers: [
        ...provideJuicebarTesting(),
        provideRouter([{
          path: 'user-wizard',
          component: UserWizardComponent,
          children: [{path: 'main', component: StepComponent}, {path: 'customers', component: StepComponent}],
        }]),
        UserTranslationPipe,
        {provide: USERS_CUSTOMIZATION, useValue: customization},
      ],
    });
    signInTestUser();
    const harness = await RouterTestingHarness.create(url);
    const element = harness.routeNativeElement!;
    const steps = () => Array.from(element.querySelectorAll<HTMLElement>('.wizard-step'));
    return {steps};
  }

  it('shows no steps when "main" is the only one', async () => {
    const {steps} = await open('/user-wizard/main');
    expect(steps()).toHaveLength(0);
  });

  it('numbers the project\'s steps after "main" and marks the current one', async () => {
    const {steps} = await open('/user-wizard/customers', {
      componentOverrides: [{routePath: ['user-wizard', 'customers'], component: StepComponent, tab: {label: 'Customers'}}],
    });
    expect(steps().map(step => step.querySelector('.wizard-step-label')!.textContent!.trim())).toEqual(['Main', 'Customers']);
    expect(steps().map(step => step.querySelector('.wizard-step-number')!.textContent!.trim())).toEqual(['1', '2']);
    expect(steps().map(step => step.getAttribute('aria-current'))).toEqual([null, 'step']);
    // Steps can't be clicked: there is nothing to press
    expect(steps()[0].querySelector('button, a')).toBeNull();
  });
});
