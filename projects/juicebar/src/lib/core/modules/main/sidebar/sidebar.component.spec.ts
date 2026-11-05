import { TestBed } from '@angular/core/testing';
import { provideJuicebarTesting, signInTestUser } from '../../../../../testing/juicebar-testing';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SidebarComponent], providers: provideJuicebarTesting() });
    signInTestUser();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
