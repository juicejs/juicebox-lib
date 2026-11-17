import {TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {provideJuicebarTesting, settle, signInTestUser} from '../../../../../testing/juicebar-testing';
import {ConfigurationService} from '../../../shared/services/configuration.service';
import {EntitiesService} from '../entities.service';
import {EntitiesTranslationPipe} from '../i18n/entities.translation';
import {EntityWizardComponent} from './entity-wizard.component';

const TYPES = [
  {name: 'private', prop: 'private', columns: []},
  {name: 'commercial', prop: 'commercial', columns: []},
  {name: 'organisation', prop: 'organisation', columns: []},
];

describe('EntityWizardComponent', () => {
  /** `state` is what the page was opened with, as the old juicebox passed it */
  async function setup(state?: unknown) {
    TestBed.configureTestingModule({
      imports: [EntityWizardComponent],
      providers: [...provideJuicebarTesting(), provideRouter([{path: '**', children: []}]), EntitiesTranslationPipe],
    });
    signInTestUser();
    vi.spyOn(TestBed.inject(ConfigurationService), 'getByKey').mockImplementation(async (key: string) =>
      key === 'entities:juicebox:settings' ? {success: true, payload: {options: {types: TYPES}}} : {success: false});
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'currentNavigation').mockReturnValue((state ? {extras: {state}} : null) as never);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const create = vi.spyOn(TestBed.inject(EntitiesService), 'create').mockResolvedValue({success: true, payload: {_id: 'new'}});
    const fixture = TestBed.createComponent(EntityWizardComponent);
    fixture.autoDetectChanges();
    await settle(fixture);
    const element = fixture.nativeElement as HTMLElement;
    const type = (text: string, selector: string) => {
      const input = element.querySelector<HTMLInputElement>(selector)!;
      input.value = text;
      input.dispatchEvent(new Event('input'));
    };
    const labels = () => [...element.querySelectorAll('app-label')].map(label => label.textContent!.trim());
    const createButton = () => [...element.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent!.trim() === 'Create')!;
    return {fixture, element, create, navigate, type, labels, createButton};
  }

  it('starts with the configuration\'s first type and the customer form when it is opened by its address', async () => {
    const {labels, element} = await setup();
    expect(element.querySelector('app-select')!.textContent).toContain('Private');
    expect(labels()).toContain('Firstname *');
    expect(labels()).toContain('Languages');
  });

  it('starts with the listing\'s type', async () => {
    const {element} = await setup({selectedType: TYPES[1], types: TYPES});
    expect(element.querySelector('app-select')!.textContent).toContain('Commercial');
  });

  it('opened from a user\'s organisations tab, shows the organisation form', async () => {
    const organisation = {name: 'Organisation', prop: 'organisation'};
    const {labels, element} = await setup({selectedType: organisation, types: [organisation]});
    expect(element.querySelector('app-select')!.textContent).toContain('Organisation');
    expect(labels()).toContain('Company name *');
    expect(labels()).not.toContain('Firstname *');
  });

  it('creates a customer with what the old page sent, then opens the listing', async () => {
    const {fixture, create, navigate, type, createButton} = await setup();
    expect(createButton().disabled).toBe(true);
    type('Ada', 'input[formcontrolname="firstname"]');
    type('Lovelace', 'input[formcontrolname="lastname"]');
    type('ada@example.com', 'input[formcontrolname="email"]');
    type('Berlin', 'input[formcontrolname="city"]');
    await settle(fixture);
    expect(createButton().disabled).toBe(false);
    createButton().click();
    await settle(fixture);
    expect(create).toHaveBeenCalledWith({
      // Never chosen: an empty list, as the old form's fields started
      salutation: [],
      sex: [],
      email: 'ada@example.com',
      title: '',
      firstname: 'Ada',
      lastname: 'Lovelace',
      name: '',
      taxNumber: '',
      phone: '',
      mobilephone: '',
      type: 'private',
      languages: [],
      phoneCallingNumber: '',
      mobilephoneCallingNumber: '',
      address: {type: 'home', street: '', street2: '', name: '', postcode: '', city: 'Berlin', country: []},
    });
    expect(navigate).toHaveBeenCalledWith('/main/entities');
  });

  it('creates an organisation from the organisation form', async () => {
    const organisation = {name: 'Organisation', prop: 'organisation'};
    const {fixture, create, type, createButton} = await setup({selectedType: organisation, types: [organisation]});
    type('Acme', 'input[formcontrolname="name"]');
    await settle(fixture);
    createButton().click();
    await settle(fixture);
    expect(create).toHaveBeenCalledWith({
      name: 'Acme',
      taxNumber: '',
      phone: '',
      mobilephone: '',
      type: 'organisation',
      address: {type: 'business', street: '', street2: '', name: 'Acme', postcode: '', city: '', country: []},
    });
  });
});
