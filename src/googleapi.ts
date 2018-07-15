import { google, sheets_v4 } from 'googleapis'
import { Observable } from 'rx'

import * as serviceAccount from '../config/serviceAccount.json'

const sheets = google.sheets('v4')
const spreadsheetId = '1ywpgN1lQW73mxu7TWOy7ghgc-LsdmmmVp5GkhZu8Upc'


const JWTAuth = new google.auth.JWT({
	scopes: 'https://www.googleapis.com/auth/spreadsheets',
	email: serviceAccount.client_email,
	key: serviceAccount.private_key
})

export const authorize =
	Observable.fromPromise(JWTAuth.authorize())
		.doOnNext((cred) => console.log(cred))
		.share()

export const getData = (params: sheets_v4.Params$Resource$Spreadsheets$Values$Get) =>
	Observable.fromPromise(sheets.spreadsheets.values.get({
		...params,
		spreadsheetId,
		auth: JWTAuth
	}))
		.flatMap(res => res.data.values as (string | number)[][])

export const setData = (params: sheets_v4.Params$Resource$Spreadsheets$Values$Update) =>
	Observable.fromPromise(sheets.spreadsheets.values.update({
		...params,
		spreadsheetId,
		auth: JWTAuth
	}))
		.flatMap(res => (res.status === 200) ? Observable.return(res.data) : Observable.throw(new Error(res.statusText)))


