import {Provider} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {ENTITIES_CUSTOMIZATION} from '../../../../../config/base-app.config';
import {provideJuicebarTesting, signInTestUser} from '../../../../../../testing/juicebar-testing';
import {DialogService} from '../../../../../ui-components';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {UserTranslationPipe} from '../../i18n/user.translation';
import {CreateOrganisationComponent} from './create-organisation/create-organisation.component';
import {OrganisationsUserComponent} from './organisations-user.component';

describe('OrganisationsUserComponent: creating an organisation', () => {
  function setup(providers: Provider[] = [], canCreate = true) {
    TestBed.configureTestingModule({
      imports: [OrganisationsUserComponent],
      providers: [...provideJuicebarTesting(), UserTranslationPipe, ...providers],
    });
    signInTestUser();
    vi.spyOn(TestBed.inject(JuiceboxService), 'hasPermission').mockReturnValue(canCreate);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const open = vi.spyOn(TestBed.inject(DialogService), 'open').mockReturnValue({closed: {subscribe: () => undefined}} as never);
    const component = TestBed.createComponent(OrganisationsUserComponent).componentInstance;
    return {component, navigate, open};
  }

  it('opens the customers module\'s create page with the one type Organisation, as the old juicebox did', async () => {
    const {component, navigate, open} = setup([{provide: ENTITIES_CUSTOMIZATION, useValue: {}}]);
    await component.createNewOrg();
    const organisation = {name: 'Organisation', prop: 'organisation'};
    expect(navigate).toHaveBeenCalledWith(['/main/entities/entity-wizard'], {state: {selectedType: organisation, types: [organisation]}});
    expect(open).not.toHaveBeenCalled();
  });

  it('in a project without the customers module, opens the same form as a dialog', async () => {
    const {component, navigate, open} = setup();
    await component.createNewOrg();
    expect(navigate).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith(CreateOrganisationComponent, {disableClose: true});
  });

  it('does neither without the create permission on customers', async () => {
    const {component, navigate, open} = setup([{provide: ENTITIES_CUSTOMIZATION, useValue: {}}], false);
    await component.createNewOrg();
    expect(navigate).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });
});
