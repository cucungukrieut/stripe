<?php
namespace Dfe\Stripe\W\Strategy;
use Df\Payment\Token;
use Df\Payment\W\Strategy\ConfirmPending;
use Df\StripeClone\W\Event as Ev;
use Magento\Sales\Model\Order as O;
use Magento\Sales\Model\Order\Payment as OP;
/**
 * 2017-11-10
 * @used-by \Dfe\Stripe\W\Handler\Source
 * @method Ev e()
 */
final class Charge3DS extends \Df\Payment\W\Strategy {
	/**
	 * 2017-11-10
	 * @override
	 * @see \Df\Payment\W\Strategy::_handle()
	 * @used-by \Df\Payment\W\Strategy::::handle()
	 */
	protected function _handle() {
		dfp_webhook_case($op = $this->op(), false); /** @var OP $op */
		/**
		 * 2017-11-12
		 * @used-by \Df\StripeClone\Payer::token()
		 * https://github.com/mage2pro/core/blob/3.3.4/StripeClone/Payer.php#L145-L155
		 */
		dfp_add_info($op, [
			/**
			 * 2017-11-12
			 * An initial reusable source for a card which requires a 3D Secure verification.
			 * A string like «src_1BMxGwFzKb8aMux1dThSCfhP».
			 * A `source.chargeable` event for a derived single-use 3D Secure source: https://mage2.pro/t/4895
			 */
			Token::KEY => $this->e()->ro('three_d_secure/card')
			/**
			 * 2017-11-11
			 * We intentionally do not set the bank card type: @see \Dfe\Stripe\Method::$II_CARD_TYPE
			 * https://github.com/mage2pro/stripe/blob/2.4.0/Method.php#L170-L175
			 * The @see \Dfe\Stripe\Method::cardType() will intentionally return `null`:
			 * https://github.com/mage2pro/stripe/blob/2.4.0/Method.php#L22-L58
			 * It is used only by @see \Dfe\Stripe\Currency::_iso3():
			 *		protected function _iso3($s = null) {return
			 *			in_array($this->m()->cardType(), ['Discover', 'JCB', 'Diners Club'])
			 * 				? 'USD' : parent::_iso3($s)
			 *		;}
			 * https://github.com/mage2pro/stripe/blob/2.4.0/Currency.php#L12-L25
			 * So @see \Dfe\Stripe\Currency::_iso3() will not adjust the payment currency to USD,
			 * and it is exactly what we need,
			 * because we was forced to define the payment currency before the 3D Secure verification,
			 * and we are unable to change it here anyway:
			 * @see \Dfe\Stripe\P\_3DS::p():
			 * 		'currency' => $i->currencyC()
			 * https://github.com/mage2pro/stripe/blob/d66c3153/P/_3DS.php#L7-L18
			 */
		]);
		/**
		 * 2017-11-11
		 * It is important that @see \Df\StripeClone\Method::isGateway() returns `true`.
		 * Otherwise, such implementation will not work because of the following code:
		 * @see \Magento\Sales\Model\Order\Invoice::register():
		 *   $captureCase = $this->getRequestedCaptureCase();
		 *		if ($this->canCapture()) {
		 *			if ($captureCase) {
		 *				if ($captureCase == self::CAPTURE_ONLINE) {
		 *					$this->capture();
		 *				}
		 *				elseif ($captureCase == self::CAPTURE_OFFLINE) {
		 *					$this->setCanVoidFlag(false);
		 *					$this->pay();
		 *				}
		 *			}
		 *		}
		 *		elseif (
		 *			!$order->getPayment()->getMethodInstance()->isGateway()
		 *			|| $captureCase == self::CAPTURE_OFFLINE
		 *		) {
		 *			if (!$order->getPayment()->getIsTransactionPending()) {
		 *				$this->setCanVoidFlag(false);
		 *				$this->pay();
		 *			}
		 *		}
		 * The code is the same in Magento 2.0.0 - 2.2.1:
		 * https://github.com/magento/magento2/blob/2.0.0/app/code/Magento/Sales/Model/Order/Invoice.php#L599-L614
		 * https://github.com/magento/magento2/blob/2.2.1/app/code/Magento/Sales/Model/Order/Invoice.php#L611-L626
		 * In this scenario isGateway() is important
		 * to avoid the @see \Magento\Sales\Model\Order\Invoice::pay() call
		 * (which marks order as paid without any actual PSP API calls).
		 * "dfp_due() should support the Stripe's 3D Secure verification scenario":
		 * https://github.com/mage2pro/core/issues/46
		 */
		$this->delegate(ConfirmPending::class);
	}
}