import { TestBed } from '@angular/core/testing';
import { provideJuicebarTesting, signInTestUser } from '../../../../../testing/juicebar-testing';
import { UserTranslationPipe } from '../i18n/user.translation';
import { DetailsUsersComponent } from './details.component';

describe('DetailsUsersComponent', () => {
  beforeEach(() => {
    // provideUsers() provides it in the app
    TestBed.configureTestingModule({ imports: [DetailsUsersComponent], providers: [...provideJuicebarTesting(), UserTranslationPipe] });
    signInTestUser();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DetailsUsersComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
