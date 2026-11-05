import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { provideJuicebarTesting, signInTestUser } from '../../../../../../testing/juicebar-testing';
import { UserTranslationPipe } from '../../i18n/user.translation';
import { DetailsUserComponent } from './details-user.component';

describe('DetailsUserComponent', () => {
  beforeEach(() => {
    // The tab reads the user id from its parent route (details/:id)
    const parent = { snapshot: { params: { id: 'test-user' } }, params: of({ id: 'test-user' }) };
    TestBed.configureTestingModule({
      imports: [DetailsUserComponent],
      providers: [...provideJuicebarTesting(), UserTranslationPipe, { provide: ActivatedRoute, useValue: { parent, snapshot: { params: {} } } }],
    });
    signInTestUser();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DetailsUserComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
