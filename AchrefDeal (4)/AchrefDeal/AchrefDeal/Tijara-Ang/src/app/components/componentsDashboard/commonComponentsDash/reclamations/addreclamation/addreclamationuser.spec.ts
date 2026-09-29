import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddReclamationUser } from './addreclamationuser';

describe('AddReclamationUser', () => {
  let component: AddReclamationUser;
  let fixture: ComponentFixture<AddReclamationUser>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddReclamationUser]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddReclamationUser);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
