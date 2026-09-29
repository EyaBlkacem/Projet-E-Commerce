import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Adduser } from './adduser';

describe('Adduser', () => {
  let component: Adduser;
  let fixture: ComponentFixture<Adduser>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Adduser]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Adduser);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
