import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HorizontalTopbarUserComponent } from './horizontal-topbar-user.component';

describe('HorizontalTopbarUserComponent', () => {
  let component: HorizontalTopbarUserComponent;
  let fixture: ComponentFixture<HorizontalTopbarUserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HorizontalTopbarUserComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HorizontalTopbarUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
