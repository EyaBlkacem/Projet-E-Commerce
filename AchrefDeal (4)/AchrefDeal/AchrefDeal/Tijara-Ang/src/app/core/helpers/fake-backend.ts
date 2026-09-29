import { Injectable } from '@angular/core';
import { HttpRequest, HttpResponse, HttpHandler, HttpEvent, HttpInterceptor, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, mergeMap, materialize, dematerialize } from 'rxjs/operators';
import { Transactions, apikeys, application, cryptoOrders, deals, folderData, projectListWidgets, recentData, sellerDetail, sellerDetals, tasks } from '../data';

// Utilisateurs de test Tijara
const Tijara_DEFAULT_USERS = [
    { id: 1, firstName: 'Admin',   lastName: 'Tijara',       email: 'admin@tijara.tn',  password: 'Admin123!',  role: 'admin',  token: 'fake-jwt-admin'  },
    { id: 2, firstName: 'Amine',   lastName: 'Touati',       email: 'user@tijara.tn',   password: 'User123!',   role: 'user',   token: 'fake-jwt-user'   },
    { id: 3, firstName: 'Achraf',  lastName: 'Saad',         email: 'vendor@tijara.tn', password: 'Vendor123!', role: 'vendor', token: 'fake-jwt-vendor' },
];

@Injectable()
export class FakeBackendInterceptor implements HttpInterceptor {

    constructor() { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

        const storedUsers: any[] = JSON.parse(sessionStorage.getItem('tijara_users')!) || [];
        const users: any[] = [...Tijara_DEFAULT_USERS, ...storedUsers];

        // wrap in delayed observable to simulate server api call
        return of(null).pipe(mergeMap(() => {

            // ─── LOGIN : auth/signin ──────────────────────────────────────
            if (request.url.endsWith('auth/signin') && request.method === 'POST') {
                const match = users.find(u =>
                    u.email === request.body.email && u.password === request.body.password
                );
                if (match) {
                    const body = {
                        status: 'success',
                        token: match.token,
                        data: {
                            id: match.id,
                            email: match.email,
                            firstName: match.firstName,
                            lastName: match.lastName,
                            role: match.role,
                        }
                    };
                    return of(new HttpResponse({ status: 200, body }));
                } else {
                    return throwError({ error: { message: 'Email ou mot de passe incorrect' } });
                }
            }

            // ─── REGISTER : auth/signup ───────────────────────────────────
            if (request.url.endsWith('auth/signup') && request.method === 'POST') {
                const { email, firstName, lastName, password, role } = request.body;
                const duplicate = users.find(u => u.email === email);
                if (duplicate) {
                    return throwError({ error: { message: 'Cet email est déjà utilisé' } });
                }
                const newUser = {
                    id: users.length + 1,
                    firstName,
                    lastName,
                    email,
                    password,
                    role: role || 'user',
                    token: 'fake-jwt-' + Date.now()
                };
                storedUsers.push(newUser);
                sessionStorage.setItem('tijara_users', JSON.stringify(storedUsers));
                return of(new HttpResponse({ status: 200, body: { status: 'success' } }));
            }

            // ─── LEGACY : /users/authenticate (rétrocompatibilité) ────────
            if (request.url.endsWith('/users/authenticate') && request.method === 'POST') {
                const match = users.find(u =>
                    u.email === request.body.email && u.password === request.body.password
                );
                if (match) {
                    const body = {
                        status: 'success',
                        token: match.token,
                        data: { id: match.id, email: match.email, role: match.role }
                    };
                    return of(new HttpResponse({ status: 200, body }));
                } else {
                    return throwError({ error: { message: 'Username or password is incorrect' } });
                }
            }

            // get users
            if (request.url.endsWith('/users') && request.method === 'GET') {
                const token = request.headers.get('Authorization');
                if (token && token.startsWith('Bearer fake-jwt-')) {
                    return of(new HttpResponse({ status: 200, body: users }));
                } else {
                    return throwError({ status: 401, error: { message: 'Unauthorised' } });
                }
            }

            // get user by id
            if (request.url.match(/\/users\/\d+$/) && request.method === 'GET') {
                const token = request.headers.get('Authorization');
                if (token && token.startsWith('Bearer fake-jwt-')) {
                    const urlParts = request.url.split('/');
                    const id = parseInt(urlParts[urlParts.length - 1]);
                    const user = users.find(u => u.id === id) || null;
                    return of(new HttpResponse({ status: 200, body: user }));
                } else {
                    return throwError({ status: 401, error: { message: 'Unauthorised' } });
                }
            }

            // register user (legacy)
            if (request.url.endsWith('/users/register') && request.method === 'POST') {
                const newUser = request.body;
                const duplicate = users.find(u => u.email === newUser.email);
                if (duplicate) {
                    return throwError({ error: { message: 'Email already taken' } });
                }
                newUser.id = users.length + 1;
                storedUsers.push(newUser);
                sessionStorage.setItem('tijara_users', JSON.stringify(storedUsers));
                return of(new HttpResponse({ status: 200 }));
            }

            // delete user
            if (request.url.match(/\/users\/\d+$/) && request.method === 'DELETE') {
                // tslint:disable-next-line: max-line-length
                // check for fake auth token in header and return user if valid, this security is implemented server side in a real application
                if (request.headers.get('Authorization') === 'Bearer fake-jwt-token') {
                    // find user by id in users array
                    const urlParts = request.url.split('/');
                    // tslint:disable-next-line: radix
                    const id = parseInt(urlParts[urlParts.length - 1]);
                    for (let i = 0; i < users.length; i++) {
                        const user = users[i];
                        if (user.id === id) {
                            // delete user
                            users.splice(i, 1);
                            sessionStorage.setItem('users', JSON.stringify(users));
                            break;
                        }
                    }

                    // respond 200 OK
                    return of(new HttpResponse({ status: 200 }));
                } else {
                    // return 401 not authorised if token is null or invalid
                    return throwError({ status: 401, error: { message: 'Unauthorised' } });
                }
            }

            // get seller
            if (request.url.endsWith('/app/seller') && request.method === 'GET') {
                if (sellerDetals) {
                    return of(new HttpResponse({ status: 200, body: sellerDetals }));
                } else {
                    return throwError({ status: 401, error: { message: 'No Data Found' } });
                }
            }

            // get Project
            if (request.url.endsWith('/app/project') && request.method === 'GET') {
                if (projectListWidgets) {
                    return of(new HttpResponse({ status: 200, body: projectListWidgets }));
                } else {
                    return throwError({ status: 401, error: { message: 'No Data Found' } });
                }
            }


            // get Kanban
            if (request.url.endsWith('/app/kanban') && request.method === 'GET') {
                if (tasks) {
                    return of(new HttpResponse({ status: 200, body: tasks }));
                } else {
                    return throwError({ status: 401, error: { message: 'No Data Found' } });
                }
            }

            // get Deal
            if (request.url.endsWith('/app/deal') && request.method === 'GET') {
                if (deals) {
                    return of(new HttpResponse({ status: 200, body: deals }));
                } else {
                    return throwError({ status: 401, error: { message: 'No Data Found' } });
                }
            }

            // get Crypto Order
            if (request.url.endsWith('/app/cryptoOrder') && request.method === 'GET') {
                if (cryptoOrders) {
                    return of(new HttpResponse({ status: 200, body: cryptoOrders }));
                } else {
                    return throwError({ status: 401, error: { message: 'No Data Found' } });
                }
            }

            // get Transaction
            if (request.url.endsWith('/app/transaction') && request.method === 'GET') {
                if (Transactions) {
                    return of(new HttpResponse({ status: 200, body: Transactions }));
                } else {
                    return throwError({ status: 401, error: { message: 'No Data Found' } });
                }
            }

            // get folder
            if (request.url.endsWith('/app/folder') && request.method === 'GET') {
                if (folderData) {
                    return of(new HttpResponse({ status: 200, body: folderData }));
                } else {
                    return throwError({ status: 401, error: { message: 'No Data Found' } });
                }
            }

            if (request.url.endsWith('/app/folder') && request.method === 'POST') {
                const newUser = request.body;
                if (folderData) {
                    return of(new HttpResponse({ status: 200, body: newUser }));
                } else {
                    return throwError({ status: 401, error: { message: 'No Data Found' } });
                }
            }

            // Update listingGrid
            if (request.url.endsWith('/app/folder') && request.method === 'PUT') {
                const updatedUser = request.body;
                if (folderData) {
                    return of(new HttpResponse({ status: 200, body: updatedUser }));
                } else {
                    return throwError({ status: 401, error: { message: 'No Data Found' } });
                }
            }

            // DELETE listingGrid
            if (request.url.endsWith('/app/folder') && request.method === 'DELETE') {
                const updatedUser = request.body;
                if (folderData) {
                    return of(new HttpResponse({ status: 200, body: updatedUser })); // respond 200 OK
                } else {
                    return throwError({ status: 401, error: { message: 'Unauthorised' } });
                }
            }

            // get file
            if (request.url.endsWith('/app/file') && request.method === 'GET') {
                if (recentData) {
                    return of(new HttpResponse({ status: 200, body: recentData }));
                } else {
                    return throwError({ status: 401, error: { message: 'No Data Found' } });
                }
            }

            if (request.url.endsWith('/app/file') && request.method === 'POST') {
                const newUser = request.body;
                if (recentData) {
                    return of(new HttpResponse({ status: 200, body: newUser }));
                } else {
                    return throwError({ status: 401, error: { message: 'No Data Found' } });
                }
            }

            // Update listingGrid
            if (request.url.endsWith('/app/file') && request.method === 'PUT') {
                const updatedUser = request.body;
                if (recentData) {
                    return of(new HttpResponse({ status: 200, body: updatedUser }));
                } else {
                    return throwError({ status: 401, error: { message: 'No Data Found' } });
                }
            }

            // DELETE listingGrid
            if (request.url.endsWith('/app/file') && request.method === 'DELETE') {
                const updatedUser = request.body;
                if (recentData) {
                    return of(new HttpResponse({ status: 200, body: updatedUser })); // respond 200 OK
                } else {
                    return throwError({ status: 401, error: { message: 'Unauthorised' } });
                }
            }

            // get application
            if (request.url.endsWith('/app/application') && request.method === 'GET') {
                if (application) {
                    return of(new HttpResponse({ status: 200, body: application }));
                } else {
                    return throwError({ status: 401, error: { message: 'No Data Found' } });
                }
            }

            if (request.url.endsWith('/app/application') && request.method === 'POST') {
                const newUser = request.body;
                if (application) {
                    return of(new HttpResponse({ status: 200, body: newUser }));
                } else {
                    return throwError({ status: 401, error: { message: 'No Data Found' } });
                }
            }

            // Update Application
            if (request.url.endsWith('/app/application') && request.method === 'PUT') {
                const updatedUser = request.body;
                if (application) {
                    return of(new HttpResponse({ status: 200, body: updatedUser }));
                } else {
                    return throwError({ status: 401, error: { message: 'No Data Found' } });
                }
            }

            // DELETE Application
            if (request.url.endsWith('/app/application') && request.method === 'DELETE') {
                const updatedUser = request.body;
                if (application) {
                    return of(new HttpResponse({ status: 200, body: updatedUser })); // respond 200 OK
                } else {
                    return throwError({ status: 401, error: { message: 'Unauthorised' } });
                }
            }

            // get apikey
            if (request.url.endsWith('/app/apikey') && request.method === 'GET') {
                if (apikeys) {
                    return of(new HttpResponse({ status: 200, body: apikeys }));
                } else {
                    return throwError({ status: 401, error: { message: 'No Data Found' } });
                }
            }

            if (request.url.endsWith('/app/apikey') && request.method === 'POST') {
                const newUser = request.body;
                if (apikeys) {
                    return of(new HttpResponse({ status: 200, body: newUser }));
                } else {
                    return throwError({ status: 401, error: { message: 'No Data Found' } });
                }
            }

            // Update apikey
            if (request.url.endsWith('/app/apikey') && request.method === 'PUT') {
                const updatedUser = request.body;
                if (apikeys) {
                    return of(new HttpResponse({ status: 200, body: updatedUser }));
                } else {
                    return throwError({ status: 401, error: { message: 'No Data Found' } });
                }
            }

            // DELETE apikey
            if (request.url.endsWith('/app/apikey') && request.method === 'DELETE') {
                const updatedUser = request.body;
                if (apikeys) {
                    return of(new HttpResponse({ status: 200, body: updatedUser })); // respond 200 OK
                } else {
                    return throwError({ status: 401, error: { message: 'Unauthorised' } });
                }
            }

            // pass through any requests not handled above
            return next.handle(request);

        }))

            // tslint:disable-next-line: max-line-length
            .pipe(materialize())
            .pipe(delay(500))
            .pipe(dematerialize());
    }
}
