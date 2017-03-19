<?php
namespace Dfe\Stripe\W\Event\Charge;
use Dfe\Stripe\Method as M;
// 2017-03-15
final class Captured extends \Dfe\Stripe\W\Event {
	/**
	 * 2017-01-06
	 * @override
	 * @see \Df\StripeClone\W\Event::ttCurrent()
	 * @used-by \Df\StripeClone\W\Event::id()
	 * @used-by \Df\StripeClone\W\Strategy\Charge::action()
	 * @return string
	 */
	function ttCurrent() {return M::T_CAPTURE;}

	/**
	 * 2017-01-06
	 * @override
	 * @see \Df\StripeClone\W\Event::ttParent()
	 * @used-by \Df\StripeClone\W\Nav::pidAdapt()
	 * @return string
	 */
	function ttParent() {return M::T_AUTHORIZE;}
}