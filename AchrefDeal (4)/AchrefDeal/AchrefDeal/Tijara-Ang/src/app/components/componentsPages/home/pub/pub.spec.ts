import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pub } from './pub';

describe('Pub', () => {
  let component: Pub;
  let fixture: ComponentFixture<Pub>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Pub]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Pub);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
