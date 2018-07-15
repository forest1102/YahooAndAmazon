import * as client from 'cheerio-httpcli'
import * as Rx from 'rx'

import { withDelay } from './customObs'

const WAIT_SEC = 3 * 1000

export const serialize = (obj: {}, encoding: string) => {
	return Object.keys(obj)
		.map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
		.sort()
		.join('&')
}

export const fetch = (url: string, retry = true, isDelayed = true) =>
	Rx.Observable.fromPromise(client.fetch(url))
		.map((result) => {
			console.log(url)
			return result.$
		})
		.let(
			obs =>
				retry ?
					obs.retryWhen(withDelay) :
					obs
		)
		.let(
			obs =>
				isDelayed ?
					obs
						.delay(WAIT_SEC) :
					obs
		)
