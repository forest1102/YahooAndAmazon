import * as Rx from 'rx'
import { getAndSave, getFromSearchSheet } from './observable'
import { searchKeys } from './title'
import * as google from './googleapi'

getAndSave()
	.subscribe(
		val => console.log(val),
		console.error
	)

// getAmazonAndYahoo({
// 	store_id: 'cosmedenet',
// 	price_to: 2000
// })
// 	.subscribe(
// 		val => console.log(val),
// 		err => console.error(err),
// 		() => console.log('complete')
// 	)
