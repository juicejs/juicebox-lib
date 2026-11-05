import { TestBed } from '@angular/core/testing';
import { provideJuicebarTesting } from '../../../../../testing/juicebar-testing';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [LoginComponent], providers: provideJuicebarTesting() });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
