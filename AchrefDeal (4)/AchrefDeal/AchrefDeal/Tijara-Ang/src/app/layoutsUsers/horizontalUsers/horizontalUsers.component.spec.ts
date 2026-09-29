import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HorizontalUsersComponent } from './horizontalUsers.component';

describe('HorizontalComponent', () => {
  let component: HorizontalUsersComponent;
  let fixture: ComponentFixture<HorizontalUsersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HorizontalUsersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HorizontalUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
