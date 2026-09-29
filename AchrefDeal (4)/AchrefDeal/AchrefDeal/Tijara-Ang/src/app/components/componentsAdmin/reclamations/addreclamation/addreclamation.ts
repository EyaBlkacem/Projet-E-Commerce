import { Component, ElementRef, Renderer2 } from '@angular/core';
import { FormControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Config } from 'src/app/Config/Config';

@Component({
  selector: 'app-addreclamation',
  standalone: false,
  templateUrl: './addreclamation.html',
  styleUrl: './addreclamation.scss',
})
export class Addreclamation {

  public Config: Config = new Config;
  APIUrl : string = this.Config.getAPIPath();

  Countries: any;
  States: any;
  Roles: any;
  userForm!: UntypedFormGroup;

  // -------------
  photoName            : string = "NoImage.jpg";
  photoNameICN         : string = "NoImage.jpg";
  photoNameICNBusiness : string = "NoImage.jpg";
  photoUrl : string =this.Config.getPhotoPath("users");
  photoProfile: string = this.photoUrl+ this.photoName;  
  photoICN: string = this.photoUrl+ this.photoNameICN;  
  photoICNBusiness: string = this.photoUrl+ this.photoNameICNBusiness; 
  //--------------------- 
  submitted = false;
  alertMessage = "";

  //****Checkbox******/
  isPremium         = false;
  isBusinessAccount = false;
  isVerified        = false;
  isActive          = false;
  gender            = 1;


  constructor(private router: Router,  private el: ElementRef,
    private renderer: Renderer2 , public translate  : TranslateService, private formBuilder: UntypedFormBuilder) {
    //translate.setDefaultLang('fr');
   
  }


 
   
  
  formFieldHelpers: string[] = [''];
  fixedSubscriptInput: FormControl = new FormControl('', [Validators.required]);
  dynamicSubscriptInput: FormControl = new FormControl('', [Validators.required]);
  fixedSubscriptInputWithHint: FormControl = new FormControl('', [Validators.required]);
  dynamicSubscriptInputWithHint: FormControl = new FormControl('', [Validators.required]);

  getFormFieldHelpersAsString(): string
  {
      return this.formFieldHelpers.join(' ');
  }
  resetForm (){

  }


  selectRole(role: string) {
    // Handle role selection logic here
    console.log('Selected role:', role);
  }


  ngOnInit(): void {
    this.userForm = this.formBuilder.group({

 
      FirstName: ['Sami', [Validators.required, Validators.minLength(3)]],
      LastName: ['Khiari', [Validators.required, Validators.minLength(3)]],
      UserName: ['medSami', [Validators.required, Validators.minLength(3)]],
      Password: ['Sami123456', [Validators.required]],
      ICN: ['123456'],
      Email: ['mohamedsamikhiari@gmail.com', [Validators.required, Validators.email]],
      
      Gender: ['male'],
      
      //IdCity: [null],
      IdRole: [3, Validators.required],
      
      IsVerified: [false],
      IsPremium: [false],
      Active: [null]


  });

  // ******************************* States ***********************************

  // this.StatesService.getStates().subscribe((res: any)=>{
  //   this.States = res;
  //   //this.Role=res;
  //   console.log(res);
  // },(error: any) => {
  //            console.log(error);
  //       if(error.status == 400 || error.status == 0){
  //         // Bad Request
  //         alert("Error Connexion Server");
  //       }
  // });
  

  // ******************************* Countries ***********************************

   
} //onInit


onSubmit() {

}

changeIsActive(){

}

changeGender(){
  
}

}
