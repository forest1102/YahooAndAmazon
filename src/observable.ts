import * as Rx from 'rx'
import * as YahooAPI from './YahooAPI'
import * as AmazonAPI from './AmazonAPI'
import { titleKeys } from './title'

import * as apis from './googleapi'


export const getYahooItemList = (params: YahooAPI.YahooParams) =>
	YahooAPI.fetchAll(params)
		.concatMap(obs =>
			obs
				.flatMap($ =>
					$('Hit')
						.toArray()
						.map(e => ({
							'商品名': $('Name', e).text(),
							'yahoo店舗価格': parseInt($('Price', e).text()) || 0,
							JAN: $('JanCode', e).text(),
							'ストアID': params.store_id,
							'URL': $('Url', e).first().text()
						}))
				)
		)

export const JANToASIN = (janCode: string) =>
	Rx.Observable.if(
		() => !!janCode,

		Rx.Observable.just({
			'Action': 'GetMatchingProductForId',
			'IdList.Id.1': janCode,
			'IdType': 'JAN'
		})
			.flatMap(queries => AmazonAPI.fetch(queries))
			.flatMap($ =>
				$('Product')
					.toArray()
					.map((product, i) => ({
						i,
						ASIN: $('ASIN', product).first().text(),
						rank: parseInt($('Rank', product).first().text()) || 0
					}))
			)
			.take(20)
			.share()
			.let(obs =>
				Rx.Observable.zip(

					obs
						.reduce((acc, { ASIN, i }) => ({
							[`ASINList.ASIN.${(i + 1)}`]: ASIN,
							...acc,
						}), null as { [key: string]: string })
						.filter(a => !!a)
						.map(asinParam => ({
							...asinParam,
							Action: 'GetLowestOfferListingsForASIN',
							ItemCondition: 'New'
						}))
						.flatMap(queries => AmazonAPI.fetch(queries))
						.doOnNext(
							$ => ($('Error').length > 0) ?
								console.log($('Error').html()) :
								null
						)
						.flatMap($ =>
							$('GetLowestOfferListingsForASINResult')
								.toArray()
								// .filter(el => !$('Error', el).length)
								.map(el => ({
									ASIN: $('ASIN', el).first().text(),
									price: Number($('LandedPrice', el).children('Amount').first().text())
								}))
						),
					obs.map(({ ASIN, rank }) => ({ ASIN, rank })),
					(LowestOfferListing, product) => ({
						...LowestOfferListing,
						...product
					} as AmazonAPI.AmazonData)
				)
			)
			.filter(val => val.price > 0)
			.catch(err => {
				console.log(JSON.stringify(err))
				return Rx.Observable.empty()
			})
	)
		.defaultIfEmpty({ ASIN: '', rank: 0, price: 0 } as AmazonAPI.AmazonData)
		.min((a, b) => a.price - b.price)
		.first()
		.map(val => ({
			'Amazon最低価格': val.price,
			'ランキング': val.rank,
			'ASIN': val.ASIN
		}))

export const getAmazonAndYahoo = (params: YahooAPI.YahooParams) =>
	getYahooItemList(params)
		.concatMap(
			yahoo =>
				Rx.Observable.of(yahoo)
					.zip(
						JANToASIN(yahoo.JAN),
						(_yahoo, amazon) =>
							({
								..._yahoo,
								...amazon,
								'AmazonURL': 'https://www.amazon.co.jp/gp/product/' + amazon.ASIN,
								'モノレートURL': 'http://mnrate.com/item/aid/' + amazon.ASIN,
								'価格差': amazon.Amazon最低価格 - _yahoo.yahoo店舗価格,
								'粗利': (amazon.Amazon最低価格 > 0) ?
									((amazon.Amazon最低価格 - _yahoo.yahoo店舗価格) / amazon.Amazon最低価格 * 100).toFixed(2) + '%' :
									''
							})
					)
		)
		.map(obj => titleKeys.map(key => String(obj[key] || '')))
		.doOnNext(console.log)


export const getFromSearchSheet = () =>
	apis.getData({
		range: '検索!A2:D',
		valueRenderOption: 'UNFORMATTED_VALUE'
	})
		.let(YahooAPI.toYahooParam)
		.doOnNext(console.log)

export const setToItemSheet = (obs: Rx.Observable<string[]>) =>
	obs
		.bufferWithTimeOrCount(30 * 1000, 50)
		.concatMap((data, i) =>
			apis.appendData({
				range: `商品!A1:${String.fromCharCode(97 + data[0].length)}`,
				valueInputOption: 'USER_ENTERED',
				requestBody: {
					values: data
				}
			})
		)
		.delay(5000)

export const getAndSave = () =>
	apis.clearData({
		range: '商品!A1:' + String.fromCharCode(97 + titleKeys.length)
	})
		.concatMap(res =>
			getFromSearchSheet()
		)
		.concatMap(params => getAmazonAndYahoo(params))
		.startWith(titleKeys)
		.let(setToItemSheet)
