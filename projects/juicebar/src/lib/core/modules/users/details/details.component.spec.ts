import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {DetailsUsersComponent} from './details.component';

describe('ArticleDetailsComponent', () => {
  let component: DetailsUsersComponent;
  let fixture: ComponentFixture<DetailsUsersComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ DetailsUsersComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailsUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
