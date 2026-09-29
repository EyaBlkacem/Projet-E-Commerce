import { HttpHeaders } from '@angular/common/http';
import { Component } from '@angular/core';  
import { ActivatedRoute, Router } from '@angular/router';
import { SettingsService } from '../services/settings.service';
import { Config } from './Config';
//import   StatusHttp from './StatusHttp.json'  ;  
// Role:   1: Employee / 2: PROF / 3: Student
// Permissions:  1: Contact Eleve  /  2 : Stream /  3: Admin

export class Security {

 public Config: Config = new Config;
 
 constructor(private settingsService: SettingsService, private router: Router) { }

public verifServer(){
    this.settingsService.VerifServer().subscribe((res: any)=>{
      console.log(res);

      if(res==false){
        alert("You need to connect a New Session");
        this.router.navigate(["/login"]);
      }
    
    },(error: any) => {
    console.log(error);
    if(error.status == 400 || error.status == 0 || error.status == 404 || error.status == 401){
      alert("Error APP Connexion Server");
      this.router.navigate(["/login"]);
    }
    });

  }
}