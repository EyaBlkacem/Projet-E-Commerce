import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayoutUsersComponent } from './layoutusers.component';

describe('LayoutComponent', () => {
  let component: LayoutUsersComponent;
  let fixture: ComponentFixture<LayoutUsersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LayoutUsersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LayoutUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
