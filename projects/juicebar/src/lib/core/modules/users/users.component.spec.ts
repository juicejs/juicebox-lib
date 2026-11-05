import { TestBed } from '@angular/core/testing';
import { provideJuicebarTesting } from '../../../../testing/juicebar-testing';
import { UsersComponent } from './users.component';

describe('UsersComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [UsersComponent], providers: provideJuicebarTesting() });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(UsersComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
