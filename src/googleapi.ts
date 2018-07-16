import { google, sheets_v4, oauth2_v2 } from 'googleapis'
import { Observable } from 'rx'
import { withDelay } from './customObs'
import * as serviceAccount from '../config/serviceAccount.json'

const sheets = google.sheets('v4')
const spreadsheetId = '1ywpgN1lQW73mxu7TWOy7ghgc-LsdmmmVp5GkhZu8Upc'

export class ServiceAccount {
	private token: any
	private JWTAuth = new google.auth.JWT({
		scopes: 'https://www.googleapis.com/auth/spreadsheets',
		email: serviceAccount.client_email,
		key: serviceAccount.private_key
	})

	constructor() { }

	authorize() {
		return Observable.if(
			() => !!this.token && this.token.expiry_date > new Date(),
			Observable.of(this.token),
			Observable.fromPromise(this.JWTAuth.authorize())
				.doOnNext(cred => console.log(JSON.stringify(cred)))
		)
			.map((cred) => {
				this.token = cred
				return this.JWTAuth
			})
	}

}

const auth = new ServiceAccount()

export const getData = (params: sheets_v4.Params$Resource$Spreadsheets$Values$Get) =>
	auth.authorize()
		.concatMap(JWTAuth =>
			Observable.fromPromise(sheets.spreadsheets.values.get({
				...params,
				spreadsheetId,
				auth: JWTAuth
			}))
		)
		.flatMap(res => res.data.values as (string | number)[][])

export const setData = (params: sheets_v4.Params$Resource$Spreadsheets$Values$Update) =>
	auth.authorize()
		.concatMap(JWTAuth =>
			Observable.fromPromise(sheets.spreadsheets.values.update({
				...params,
				spreadsheetId,
				auth: JWTAuth
			})))
		.flatMap(res => (res.status === 200) ? Observable.return(res.data) : Observable.throw(new Error(res.statusText)))
		.retryWhen(withDelay)


export const clearData = (params: sheets_v4.Params$Resource$Spreadsheets$Values$Clear) =>
	auth.authorize()
		.concatMap(JWTAuth =>
			Observable.fromPromise(sheets.spreadsheets.values.clear({
				...params,
				spreadsheetId,
				auth: JWTAuth
			}))
		)
		.flatMap(res => (res.status === 200) ? Observable.return(res.data) : Observable.throw(new Error(res.statusText)))
		.retryWhen(withDelay)

export const appendData = (params: sheets_v4.Params$Resource$Spreadsheets$Values$Append) =>
	auth.authorize()
		.concatMap(JWTAuth =>
			Observable.fromPromise(sheets.spreadsheets.values.append({
				...params,
				spreadsheetId,
				auth: JWTAuth
			}))
		)
		.flatMap(res => (res.status === 200) ? Observable.return(res.data) : Observable.throw(new Error(res.statusText)))
		.retryWhen(withDelay)
