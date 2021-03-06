/**
 * 2016-03-01
 * 2017-10-12 «Stripe.js v2 Reference»: https://stripe.com/docs/stripe.js/v2
 * 2017-10-16
 * I am starting to move the code to the «Elements» technology:
 * *) «Stripe Elements Quickstart»: https://stripe.com/docs/elements
 * *) «Stripe.js Reference»: https://stripe.com/docs/stripe.js
 * *) «Creating a custom payment form with Stripe.js is deprecated»:
 * https://github.com/mage2pro/stripe/issues/3
 */
define([
	'df', 'Df_StripeClone/main', 'jquery', 'Magento_Checkout/js/model/quote'
   /**
	* 2017-10-16
	* «Including Stripe.js»: https://stripe.com/docs/stripe.js#including-stripejs
	* «To best leverage Stripe’s advanced fraud functionality,
	* include this script on every page on your site, not just the checkout page.
	* This allows Stripe to detect anomalous behavior
	* that may be indicative of fraud as users browse your website.»
	* https://github.com/mage2pro/stripe/issues/33
	* I have implemented it, @see \Dfe\Stripe\Block\Js::_toHtml():
	*	final protected function _toHtml() {return !dfps($this)->enable() ? '' : df_js(
	*		null, 'https://js.stripe.com/v2/'
	*	);}
	* https://github.com/mage2pro/stripe/blob/2.1.1/Block/Js.php#L39-L41
	* But I need to require Stripe.js here too,
	* because I need to encure that the script is loaded before Dfe_Stripe/main.js execution.
	*/
	,'https://js.stripe.com/v3/'
], function(df, parent, $, quote) {'use strict';
/** 2017-09-06 @uses Class::extend() https://github.com/magento/magento2/blob/2.2.0-rc2.3/app/code/Magento/Ui/view/base/web/js/lib/core/class.js#L106-L140 */
return parent.extend({
	defaults: {df: {card: {new: {
		/**
		 * 2017-10-16
		 * @override
		 * @see Df_Payment/card
		 */
		fields: 'Dfe_Stripe/card/fields'
	}}}},
	/**
	 * 2017-10-12
	 * r looks like:
	 *	{
	 *		card: {
	 *			address_city: "Palo Alto",
	 *			address_country: "US",
	 *			address_line1: "12 Main Street",
	 *			address_line2: "Apt 42",
	 *			address_state: "CA",
	 *			address_zip: "94301",
	 *			brand: "Visa",
	 *			country: "US",
	 *			exp_month: 2,
	 *			exp_year: 2018,
	 *			funding: "credit",
	 *			last4: "4242",
	 *			name: null,
	 *			object: "card"
	 *		},
	 *		created: 1507803936,
	 *		id: "tok_8DPg4qjJ20F1aM",
	 *		livemode: true,
	 *		object: "token",
	 *		type: "card",
	 *		used: false
	 *	}
	 * https://stripe.com/docs/stripe.js/v2
	 * 2017-10-17
	 * Note 1. «The token object»: https://stripe.com/docs/api#token_object
	 * Note 2. `brand`:
	 * «Card brand. Can be Visa, American Express, MasterCard, Discover, JCB, Diners Club, or Unknown.»
	 * https://stripe.com/docs/api#token_object-card-brand
	 * 2017-10-21
	 * 1) A response to `stripe.createSource`: https://mage2.pro/t/4728
	 * 2) «Stripe API Reference» → «Sources» → «The source object»: https://stripe.com/docs/api#source_object
	 * @override
	 * @see Df_StripeClone/main::dfDataFromTokenResp()
	 * @used-by Df_StripeClone/main::dfData()
	 * @param {Object} r
	 * @returns {Object}
	 */
	dfDataFromTokenResp: function(r) {return {cardType: r.source.card.brand};},
	/**
	 * 2017-10-17
	 * @override
	 * @see Df_Payment/card::dfFormCssClasses()
	 * https://github.com/mage2pro/core/blob/3.2.6/Payment/view/frontend/web/card.js#L113-L122
	 * @used-by Df_Payment/mixin::dfFormCssClassesS()
	 * https://github.com/mage2pro/core/blob/2.0.25/Payment/view/frontend/web/mixin.js?ts=4#L171
	 * @returns {String[]}
	 */
	dfFormCssClasses: function() {return this._super().concat([
		this.singleLineMode() ? 'df-singleLineMode' : 'df-multiLineMode'
	]);},
 	/**
	 * 2017-10-16
	 * Magento <= 2.1.0 calls an `afterRender` handler outside of the `this` context.
	 * It passes `this` to an `afterRender` handler as the second argument:
	 * https://github.com/magento/magento2/blob/2.0.9/app/code/Magento/Ui/view/base/web/js/lib/ko/bind/after-render.js#L19
	 * Magento >= 2.1.0 calls an `afterRender` handler within the `this` context:
	 * https://github.com/magento/magento2/blob/2.1.0/app/code/Magento/Ui/view/base/web/js/lib/knockout/bindings/after-render.js#L20
	 * @used-by Dfe_Stripe/fields.html
	 * @param {HTMLElement} e
	 * @param {Object} _this
	 */
	dfOnRender: function(e, _this) {$.proxy(function(e) {
		/** @type {jQuery} HTMLDivElement */ var $e = $(e);
		/** @type {String} */ var type = $e.data('type');
		/** @type {Object} */ this.stripe = this.stripe || Stripe(this.publicKey());
		/**
		 * 2017-10-17
		 * We need a single instance of Elements,
		 * otherwise Stripe will think the elements are belogs to separate forms.
		 * https://stackoverflow.com/a/42963215
		 * @type {Object}
		 */
		this.stripeElements = this.stripeElements || this.stripe.elements();
		/**
		 * 2017-11-15
		 * "Stripe.js: «Can only create one Element of type cardNumber»"
		 * https://github.com/mage2pro/stripe/issues/52
		 * https://mage2.pro/t/4959
		 */
		this.stripeElementsRegistry = this.stripeElementsRegistry || {};
		var prev = this.stripeElementsRegistry[type];
		if (prev) {
			// 2017-11-15 https://stripe.com/docs/stripe-js/reference#other-methods
			prev.destroy();
			delete this.stripeElementsRegistry[type];
		}
		/**
		 * 2017-10-16
		 * https://stripe.com/docs/stripe.js#stripe-function
		 * https://stripe.com/docs/stripe.js#stripe-elements
		 * «A flexible single-line input that collects all necessary card details.»
		 * https://stripe.com/docs/stripe.js#element-types
		 * `Element` options: https://stripe.com/docs/stripe.js#element-options
		 * @type {Object}
		 */
		var lElement = this.stripeElementsRegistry[type] = this.stripeElements.create(type, {
			// 2017-08-25 «Hides any icons in the Element. Default is false.»
			hideIcon: false
			// 2017-08-25
			// «Hide the postal code field (if applicable to the Element you're creating).
			// Default is false.
			// If you are already collecting a billing ZIP or postal code on the checkout page,
			// you should set this to true.»
			,hidePostalCode: true
			// 2017-08-25 «Appearance of the icons in the Element. Either 'solid' or 'default'.»
			,iconStyle: 'solid'
			/**
			 * 2017-08-25
			 * Note 1: «Customize the placeholder text.
			 * This is only available for the cardNumber, cardExpiry, cardCvc, and postalCode Elements.»
			 * Note 2: If the `placeholder` key is present for a `card` element (even with an empty value),
			 * then Stripe warns in the browser's console:
			 * «This Element (card) does not support custom placeholders.»
			 */
			//,placeholder: ''
			/**
			 * 2017-08-25
			 * «Customize appearance using CSS properties.
			 * Style is specified as an object for any of the following variants:
			 * 	*) `base`: base style—all other variants inherit from this style
			 *	*) `complete`: applied when the Element has valid input
			 *	*) `empty`: applied when the Element has no user input
			 *	*) `invalid`: applied when the Element has invalid input
			 * For each of the above, the following properties can be customized:
			 * 		`color`
			 * 		`fontFamily`
			 * 		`fontSize`
			 * 		`fontSmoothing`
			 * 		`fontStyle`
			 * 		`fontVariant`
			 * 		`iconColor`
			 * 		`lineHeight`
			 * 		`letterSpacing`
			 * 		`textAlign`: Avaliable for the cardNumber, cardExpiry, cardCvc, and postalCode Elements.
			 * 		`textDecoration`
			 * 		`textShadow`
			 * 		`textTransform`
			 * The following pseudo-classes and pseudo-elements can also be styled with the above properties,
			 * as a nested object inside the variant:
			 * 		:hover
			 * 		:focus
			 * 		::placeholder
			 * 		::selection
			 * 		:-webkit-autofill
			 * »
			 */
			,style: {base: {
				'::placeholder': {color: 'rgb(194, 194, 194)'}
				,color: 'black'
				,fontFamily: "'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif"
				,fontSize: '14px'
				,iconColor: '#1979c3'
				,lineHeight: '1.42857143'
			}}
			/**
			 * 2017-08-25
			 * «A pre-filled value (for single-field inputs) or set of values (for multi-field inputs)
			 * to include in the input (e.g., {postalCode: '94110'}).
			 * Note that sensitive card information (card number, CVC, and expiration date) cannot be pre-filled.»
			 */
			,value: {}
		});
		// 2017-08-25
		// «mount() accepts either a CSS Selector or a DOM element.»
		// https://stripe.com/docs/stripe.js#element-mount
		lElement.mount(e);
		// 2017-10-21 «Stripe.js Reference» → «element.on(event, handler)».
		// https://stripe.com/docs/stripe.js#element-on
		lElement.on('change', $.proxy(function(event) {
			/**
			 * 2017-10-21
			 * «The current validation error, if any.
			 * Comprised of `message`, `code`, and `type` set to `validation_error`.»
			 * https://stripe.com/docs/stripe.js#element-on
			 */
			if (event.error) {
				this.showErrorMessage(event.error.message);
			}
			else {
				this.messageContainer.clear();
				/**
				 * 2017-10-21
				 * Note 1.
				 * «Applies to the `card` and `cardNumber` Elements only.
				 * Contains the card brand (e.g., `visa` or `amex`) of the card number being entered.»
				 * https://stripe.com/docs/stripe.js#element-on
				 *
				 * Note 2.
				 * The `this.selectedCardType` property is used not only for decoration
				 * (to show the selected card brang logotype),
				 * but also by @see Df_Payment/card::validate():
				 *	var r = !this.isNewCardChosen() || !!this.selectedCardType();
				 *	if (!r) {
				 *		this.showErrorMessage(
				 *			'It looks like you have entered an incorrect bank card number.'
				 *		);
				 *	}
				 * https://github.com/mage2pro/core/blob/3.2.14/Payment/view/frontend/web/card.js#L287-L299
				 * So it is vital to initialize it, otherwise we will get the failure:
				 * «It looks like you have entered an incorrect bank card number»
				 * https://github.com/mage2pro/stripe/issues/44
				 *
				 * Note 3.
				 * The `event.brand` property is present
				 * only on the `card` and `cardNumber` Elements edition.
				 * It is not present on other elements edition (e.g. `cardCvc`).
				 *
				 * Note 4.
				 * The Stripe documentation does not enumerate
				 * all the `event.brand` possitble values.
				 * I have found them experimentally by entering the test card numbers of all the brands:
				 * https://stripe.com/docs/testing#cards
				 */
				if (event.brand) {
					this.selectedCardType(df.tr(event.brand, {
						amex: 'AE'
						,discover: 'DI'
						,diners: 'DN'
						,jsb: 'JCB'
						,mastercard: 'MC'
						,visa: 'VI'
					}));
				}
			}
		}, this));
		if (-1 !== ['card', 'cardNumber'].indexOf(type)) {
			this.lCard = lElement;
		}
	}, _this, e)();},
	/**
	 * 2016-03-01
	 * 2016-03-08
	 * Раньше реализация была такой:
	 * return _.keys(this.getCcAvailableTypes())
	 *
	 * https://web.archive.org/web/20160321062153/https://support.stripe.com/questions/which-cards-and-payment-types-can-i-accept-with-stripe
	 * «Which cards and payment types can I accept with Stripe?
	 * With Stripe, you can charge almost any kind of credit or debit card:
	 * U.S. businesses can accept
			Visa, MasterCard, American Express, JCB, Discover, and Diners Club.
	 * Australian, Canadian, European, and Japanese businesses can accept
	 * 		Visa, MasterCard, and American Express.»
	 *
	 * Не стал делать реализацию на сервере, потому что там меня не устраивал
	 * порядок следования платёжных систем (первой была «American Express»)
	 * https://github.com/magento/magento2/blob/cf7df72/app/code/Magento/Payment/etc/payment.xml#L10-L44
	 * А изменить этот порядок коротко не получается:
	 * https://github.com/magento/magento2/blob/487f5f45/app/code/Magento/Payment/Model/CcGenericConfigProvider.php#L105-L124
	 * 
	 * 2017-02-05 The bank card network codes: https://mage2.pro/t/2647
	 *
	 * 2017-10-12
	 * Note 1. «JCB, Discover, and Diners Club cards can only be charged in USD»:
	 * https://github.com/mage2pro/stripe/issues/28
	 * Note 2. «Can a non-USA merchant accept the JCB, Discover, and Diners Club bank cards?»
	 * https://mage2.pro/t/4670
	 * @returns {String[]}
	 */
	getCardTypes: function() {return(
		['VI', 'MC', 'AE'].concat(!this.config('isUS') ? [] : ['JCB', 'DI', 'DN'])
	);},
	/**
	 * 2017-10-17
	 * @returns {Boolean}
	 */
	singleLineMode: function() {return this.config('singleLineMode');},
    /**
	 * 2017-02-16
	 * 2017-10-17 https://stripe.com/docs/stripe.js#stripe-create-token
	 * @override
	 * @see Df_StripeClone/main::tokenCheckStatus()
	 * https://github.com/mage2pro/core/blob/2.7.9/StripeClone/view/frontend/web/main.js?ts=4#L8-L15
	 * @used-by Df_StripeClone/main::placeOrder()
	 * https://github.com/mage2pro/core/blob/2.7.9/StripeClone/view/frontend/web/main.js?ts=4#L75
	 * @param {Object} r
	 * @returns {Boolean}
	 */
	tokenCheckStatus: function(r) {return !r.error;},
    /**
	 * 2017-02-16
	 * 2017-08-25
	 * https://stripe.com/docs/stripe.js#stripe-create-token
	 * «stripe.createToken returns a Promise which resolves with a result object.»
	 * https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise
	 * 2017-10-20
	 * Note 1.
	 * `Create a Source object instead of a token on the client side:
	 * it will allow us to implement additional Stripe's payment options in future
	 * (3D Secure, local European and Chinese payment options, etc.)`:
	 * https://github.com/mage2pro/stripe/issues/40
	 * Note 2.
	 * «Use `stripe.createSource` to convert payment information collected by Elements
	 * into a Source object that you safely pass to your server to use in an API call.»
	 * https://stripe.com/docs/stripe.js#stripe-create-source
	 * @override
	 * @see https://github.com/mage2pro/core/blob/2.0.11/StripeClone/view/frontend/web/main.js?ts=4#L21-L29
	 * @used-by Df_StripeClone/main::placeOrder()
	 * https://github.com/mage2pro/core/blob/2.7.9/StripeClone/view/frontend/web/main.js?ts=4#L73
	 * @param {Object} params
	 * @param {Function} callback
	 */
	tokenCreate: function(params, callback) {
		this.stripe.createSource(
			/**
			 * 2017-10-20
		 	 * «The Element containing payment source information.
			 * The Element will pull data from other Elements you’ve created on the same instance of elements.
			 * The Element will determine the type of the Source returned.
			 * For example, the `card` and `cardNumber` Elements will create `card` Sources.»
			 * https://stripe.com/docs/stripe.js#stripe-create-source
		  	 */
			this.lCard
			/**
			 * 2017-10-20
			 * Note 1.
			 * «An optional object containing additional payment source information that you have collected.»
			 * https://stripe.com/docs/stripe.js#stripe-create-source
			 * Note 2. «Stripe API Reference» → «Create a source»: https://stripe.com/docs/api#create_source
		  	 */
			,params
		).then(function(r) {callback(r, r);})
	;},
    /**
	 * 2017-02-16 https://stripe.com/docs/api#errors
	 * 2017-10-17 https://stripe.com/docs/stripe.js#stripe-create-token
	 * @override
	 * @see https://github.com/mage2pro/core/blob/2.0.11/StripeClone/view/frontend/web/main.js?ts=4#L31-L39
	 * @used-by placeOrder()
	 * @param {Object} r
	 * @returns {String}
	 */
	tokenErrorMessage: function(r) {return r.error.message;},
    /**
	 * 2017-02-16
	 * 2017-10-17
	 * https://stripe.com/docs/stripe.js#stripe-create-token
	 * «Stripe API Reference» → «Tokens» → «The token object»: https://stripe.com/docs/api#token_object
	 * 2017-10-21
	 * Note 1.
	 * «Stripe API Reference» → «Sources» → «The source object»: https://stripe.com/docs/api#source_object
	 * Note 2. A response to `stripe.createSource`: https://mage2.pro/t/4728
	 * 2017-10-22
	 * I add the «new_» prefix to a new source ID to distinguish it from the previously used sources.
	 * @see \Dfe\Stripe\Facade\Token::trimmed()
	 * @override
	 * @see https://github.com/mage2pro/core/blob/2.0.11/StripeClone/view/frontend/web/main.js?ts=4#L41-L48
	 * @used-by placeOrder()
	 * @param {Object} r
	 * @returns {String}
	 */
	tokenFromResponse: function(r) {return 'new_' + r.source.id;},
    /**
	 * 2017-02-16
	 * 2017-08-31
	 * Note 1. https://stripe.com/docs/stripe.js/v2#card-createToken
	 * Note 2. `I want to pass the customer's billing address to the createToken() Stripe.js method`
	 * https://mage2.pro/t/4412
	 * Note 3. `Use rules to automatically block payments or place them in review`:
	 * https://stripe.com/docs/disputes/prevention#using-rules
	 * 2017-10-17 https://stripe.com/docs/stripe.js#stripe-create-token
	 * 2017-10-20
	 * Note 1.
	 * `Create a Source object instead of a token on the client side:
	 * it will allow us to implement additional Stripe's payment options in future
	 * (3D Secure, local European and Chinese payment options, etc.)`:
	 * https://github.com/mage2pro/stripe/issues/40
	 * Note 2. «Stripe API Reference» → «Create a source»: https://stripe.com/docs/api#create_source
	 * @override
	 * @see Df_StripeClone/main::tokenParams()
	 * https://github.com/mage2pro/core/blob/2.7.9/StripeClone/view/frontend/web/main.js?ts=4#L42-L48
	 * @used-by Df_StripeClone/main::placeOrder()
	 * https://github.com/mage2pro/core/blob/2.7.9/StripeClone/view/frontend/web/main.js?ts=4#L73
	 * @returns {Object}
	 */
	tokenParams: function() {return {
		/**
		 * 2017-10-20
		 * Note 1. «Stripe API Reference» → «Create a source» → «amount».
		 * «Amount associated with the source.
		 * This is the amount for which the source will be chargeable once ready.»
		 * https://stripe.com/docs/api#create_source-amount
		 * Integer, optional. Required for `single_use` sources.
		 * Note 2. «Payment Methods Supported by the Sources API» → «Single-use or reusable».
		 * https://stripe.com/docs/sources#single-use-or-reusable
		 */
		amount: null
		/**
		 * 2017-10-20 «Stripe API Reference» → «Create a source» → «currency».
		 * «Three-letter ISO code for the currency associated with the source.
		 * This is the currency for which the source will be chargeable once ready.»
		 * https://stripe.com/docs/api#create_source-currency
		 * https://stripe.com/docs/currencies#presentment-currencies
		 * Currency, optional.
		 */
		,currency: null
		/**
		 * 2017-10-20 «Stripe API Reference» → «Create a source» → «flow».
		 * «The authentication flow of the source to create.
		 * `flow` is one of `redirect`, `receiver`, `code_verification`, `none`.
		 * It is generally inferred unless a type supports multiple flows.»
		 * https://stripe.com/docs/api#create_source-flow
		 * https://stripe.com/docs/api#source_object-flow
		 * String, optional.
		 */
		,flow: null
		/**
		 * 2017-10-20 «Stripe API Reference» → «Create a source» → «metadata».
		 * «A set of key/value pairs that you can attach to a source object.
		 * It can be useful for storing additional information about the source in a structured format.»
		 * https://stripe.com/docs/api#create_source-metadata
		 * https://stripe.com/docs/api#source_object-metadata
		 * Hash, optional.
		 */
		,metadata: {}
		/**
		 * 2017-10-20 «Stripe API Reference» → «Create a source» → «owner».
		 * «Information about the owner of the payment instrument
		 * that may be used or required by particular source types.»
		 * https://stripe.com/docs/api#create_source-owner
		 * https://stripe.com/docs/api#source_object-owner
		 * Hash, optional.
		 * 2017-11-28
		 * An empty value for `name` leads to the failure:
		 * «You passed an empty string for 'owner[name]'.
		 * We assume empty values are an attempt to unset a parameter;
		 * however 'owner[name]' cannot be unset.
		 * You should remove 'owner[name]' from your request or supply a non-empty value.»
		 * https://mage2.pro/t/5011
		 * To evade such failure, I have added df.clean().
		 */
		,owner: df.clean({
			/**
			 * 2017-10-20 «Owner’s address».
			 * «Stripe API Reference» → «Create a source» → «owner» → «address».
			 * https://stripe.com/docs/api#create_source-owner-address
			 * https://stripe.com/docs/api#source_object-owner-address
			 * Hash, optional.
			 */
			address: this._pAddress()
			/**
			 * 2017-10-20 «Owner’s email address».
			 * «Stripe API Reference» → «Create a source» → «owner» → «email».
			 * https://stripe.com/docs/api#create_source-owner-email
			 * https://stripe.com/docs/api#source_object-owner-email
			 * String, optional.
			 */
			,email: this.dfc.email()
			/**
			 * 2017-10-20 «Owner’s full name».
			 * «Stripe API Reference» → «Create a source» → «owner» → «name».
			 * https://stripe.com/docs/api#create_source-owner-name
			 * https://stripe.com/docs/api#source_object-owner-name
			 * String, optional.
			 * 2017-11-28
			 * An empty value leads to the failure:
			 * «You passed an empty string for 'owner[name]'.
			 * We assume empty values are an attempt to unset a parameter;
			 * however 'owner[name]' cannot be unset.
			 * You should remove 'owner[name]' from your request or supply a non-empty value.»
			 * https://mage2.pro/t/5011
			 * To evade such failure, I have added df.clean() to the whole `owner` object (see above).
			 */
			,name: this.cardholder()
			/**
			 * 2017-10-20 «Owner’s phone number (including extension)».
			 * «Stripe API Reference» → «Create a source» → «owner» → «phone».
			 * https://stripe.com/docs/api#create_source-owner-phone
			 * https://stripe.com/docs/api#source_object-owner-phone
			 * String, optional.
			 */
			,phone: this._pPhone()
		})
		/**
		 * 2017-10-20 «Stripe API Reference» → «Create a source» → «redirect».
		 * «Parameters required for the redirect flow.
		 * Required if the source is authenticated by a redirect (`flow` is `redirect`).».
		 * https://stripe.com/docs/api#create_source-redirect
		 * https://stripe.com/docs/api#source_object-redirect
		 * Hash, optional.
		 */
		,redirect: {
			/**
			 * 2017-10-20 «Stripe API Reference» → «Create a source» → «redirect» → «return_url».
			 * «The URL you provide to redirect the customer back to you
			 * after they authenticated their payment».
			 * https://stripe.com/docs/api#create_source-redirect-return_url
			 * https://stripe.com/docs/api#source_object-redirect-return_url
			 * String, required.
			 */
			return_url: null
		}
		/**
		 * 2017-10-20 «Stripe API Reference» → «Create a source» → «statement_descriptor».
		 * «An arbitrary string to be displayed on your customer’s statement.
		 * As an example, if your website is "RunClub" and the item you’re charging for is a race ticket,
		 * you may want to specify a `statement_descriptor` of "RunClub 5K race ticket".
		 * While many payment types will display this information, some may not display it at all.».
		 * https://stripe.com/docs/api#create_source-statement_descriptor
		 * https://stripe.com/docs/api#source_object-statement_descriptor
		 * String, optional.
		 */
		,statement_descriptor: null
		/**
		 * 2017-10-20 «Stripe API Reference» → «Create a source» → «token».
		 * «An optional token used to create the source.
		 * When passed, token properties will override source parameters.».
		 * https://stripe.com/docs/api#create_source-token
		 * String, optional.
		 */
		,token: null
		/**
		 * 2017-10-20 «Stripe API Reference» → «Create a source» → «type».
		 * «The type of the source.
		 * The `type` is a payment method, one of:
		 * 		`alipay`, `bancontact`, `card`, `giropay`, `ideal`, `sepa_debit`, `sofort`, `three_d_secure`
		 * An additional hash is included on the source with a name matching this value.
		 * It contains additional information specific to the payment method used.»
		 * https://stripe.com/docs/api#source_object-type
		 */
		,type: 'card'
		/**
		 * 2017-10-20 «Stripe API Reference» → «Create a source» → «usage».
		 * «Either `reusable` or `single_use`.
		 * Whether this source should be reusable or not.
		 * Some source types may or may not be reusable by construction,
		 * while other may leave the option at creation.
		 * If an incompatible value is passed, an error will be returned.».
		 * https://stripe.com/docs/api#create_source-usage
		 * https://stripe.com/docs/api#source_object-usage
		 * String, optional.
		 *
		 * 2017-10-21 «Payment Methods Supported by the Sources API» → «Single-use or reusable».
		 * «Certain payment methods allow for the creation of sources
		 * that can be reused for additional payments
		 * without your customer needing to complete the payment process again.
		 * Sources that can be reused have their `usage` parameter set to `reusable`.
		 *
		 * Conversely, if a source can only be used once, this parameter is set to `single_use`
		 * and a source must be created each time a customer makes a payment.
		 * Such sources should not be attached to customers and should be charged directly instead.
		 * They can only be charged once and their status will transition to `consumed`
		 * when they get charged.
		 *
		 * Reusable sources must be attached to a `Customer` in order to be reused
		 * (they will get consumed as well if otherwise charged directly).
		 * Refer to the Sources & Customers guide to learn how to attach Sources to Customers
		 * and manage a Customer’s sources list.»
		 * https://stripe.com/docs/sources#single-use-or-reusable
		 * https://stripe.com/docs/sources/customers
		 */
		,usage: 'reusable'
	};},
 	/**
	 * 2017-10-21
	 * @private
	 * @used-by tokenParams()
	 * @returns {Object}
	 */
	_pAddress: function() {
		/**
		 * 2017-08-31
		 * Note 1.
		 * An address looks like:
		 *	{
		 *		"city": "Rio de Janeiro",
		 *		"countryId": "BR",
		 *		"customerAddressId": "7",
		 *		"customerId": "1",
		 *		"firstname": "Dmitry",
		 *		"lastname": "Fedyuk",
		 *		"postcode": "22630-010",
		 *		"region": "Rio de Janeiro",
		 *		"regionCode": "RJ",
		 *		"regionId": "502",
		 *		"saveInAddressBook": null,
		 *		"street": ["Av. Lúcio Costa, 3150 - Barra da Tijuca"],
		 *		"telephone": "+55 21 3139-8000",
		 *		"vatId": "11438374798"
		 *	}
		 * @param {Object} a
		 * @param {String=} a.city	«Rio de Janeiro»
		 * @param {String=} a.countryId	«BR»
		 * @param {Number=} a.customerAddressId	«7»
		 * @param {Number=} a.customerId	«1»
		 * @param {String} a.firstname	«Dmitry»
		 * @param {String} a.lastname	«Fedyuk»
		 * @param {String=} a.postcode	«22630-010»
		 * @param {String=} a.region	«Rio de Janeiro»
		 * @param {String=} a.regionCode	«RJ»
		 * @param {Number=} a.regionId	«502»
		 * @param {?Boolean} a.saveInAddressBook	«null»
		 * @param {String[]} a.street	«["Av. Lúcio Costa, 3150 - Barra da Tijuca"]»
		 * @param {String=} a.telephone	«+55 21 3139-8000»
		 * @param {String=} a.vatId	«11438374798»
		 * https://github.com/mage2pro/core/blob/2.11.2/Payment/view/frontend/web/billingAddressChange.js#L14-L55
		 *
		 * Note 2.
		 * quote.billingAddress() always returns an address.
		 * If the «Require the billing address?» option is disabled, and the customer is new,
		 * then Magento will return the shipping address from the previous checkout step as the billing address.
		 */
		var a = quote.billingAddress();
		return {
			/**
			 * 2017-10-20 «City/District/Suburb/Town/Village».
			 * «Stripe API Reference» → «Create a source» → «owner» → «address» → «city».
			 * https://stripe.com/docs/api#create_source-owner-address-city
			 * https://stripe.com/docs/api#source_object-owner-address-city
			 * String, optional.
			 */
			city: a.city
			/**
			 * 2017-10-20 «2-letter country code».
			 * «Stripe API Reference» → «Create a source» → «owner» → «address» → «country».
			 * https://stripe.com/docs/api#create_source-owner-address-country
			 * https://stripe.com/docs/api#source_object-owner-address-country
			 * String, optional.
			 */
			,country: a.countryId
			/**
			 * 2017-10-20 «Address line 1 (Street address/PO Box/Company name)».
			 * «Stripe API Reference» → «Create a source» → «owner» → «address» → «line1».
			 * https://stripe.com/docs/api#create_source-owner-address-line1
			 * https://stripe.com/docs/api#source_object-owner-address-line1
			 * String, optional.
			 */
			,line1: a.street[0]
			/**
			 * 2017-10-20 «Address line 2 (Apartment/Suite/Unit/Building)».
			 * «Stripe API Reference» → «Create a source» → «owner» → «address» → «line2».
			 * https://stripe.com/docs/api#create_source-owner-address-line2
			 * https://stripe.com/docs/api#source_object-owner-address-line2
			 * String, optional.
			 */
			,line2: a.street[1]
			/**
			 * 2017-10-20 «Zip/Postal Code».
			 * «Stripe API Reference» → «Create a source» → «owner» → «address» → «postal_code».
			 * https://stripe.com/docs/api#create_source-owner-address-postal_code
			 * https://stripe.com/docs/api#source_object-owner-address-postal_code
			 * String, optional.
			 */
			,postal_code: a.postcode
			/**
			 * 2017-10-20 «State/County/Province/Region».
			 * «Stripe API Reference» → «Create a source» → «owner» → «address» → «state».
			 * https://stripe.com/docs/api#create_source-owner-address-state
			 * https://stripe.com/docs/api#source_object-owner-address-state
			 * String, optional.
			 */
			,state: a.region
		};
	},
	/**
	 * 2017-10-21
	 * @private
	 * @used-by tokenParams()
	 * @returns {String}
	 */
	_pPhone: function() {
		/** @type {Object} */ var a = quote.billingAddress();
		/** @type {Object} */ var c = window.checkoutConfig.customerData;
		return df.s.normalizePhone(a.telephone || (c && c.telephone ? c.telephone : ''));
	}
});});