<?php
namespace Dfe\Stripe\Handler\Charge;
use Df\Sales\Model\Order\Payment as DfPayment;
use Dfe\Stripe\Handler\Charge;
use Magento\Sales\Api\CreditmemoManagementInterface as CMI;
use Magento\Sales\Controller\Adminhtml\Order\CreditmemoLoader;
use Magento\Sales\Model\Order;
use Magento\Sales\Model\Order\Creditmemo;
use Magento\Sales\Model\Order\Invoice;
use Magento\Sales\Model\Order\Payment;
// 2016-03-27
// https://stripe.com/docs/api#event_types-charge.refunded
class Refunded extends Charge {
	/**
	 * 2016-03-27
	 * @override
	 * «How is an online refunding implemented?» https://mage2.pro/t/959
	 *
	 * Сначала хотел cделать по аналогии с @see \Magento\Paypal\Model\Ipn::_registerPaymentRefund()
	 * https://github.com/magento/magento2/blob/9546277/app/code/Magento/Paypal/Model/Ipn.php#L467-L501
	 * Однако используемый там метод @see \Magento\Sales\Model\Order\Payment::registerRefundNotification()
	 * нерабочий: «Invalid method Magento\Sales\Model\Order\Creditmemo::register»
	 * https://mage2.pro/t/1029
	 *
	 * Поэтому делаю по аналогии с
	 * @see \Magento\Sales\Controller\Adminhtml\Order\Creditmemo\Save::execute()
	 *
	 * @see \Dfe\Stripe\Handler::_process()
	 * @used-by \Dfe\Stripe\Handler::process()
	 * @return mixed
	 */
	protected function process() {
		/** @var CMI $cmi */
		$cmi = df_om()->create(CMI::class);
		$cmi->refund($this->cm(), false);
		return $this->cm()->getId();
	}

	/**
	 * 2016-03-27
	 * @return Creditmemo
	 */
	private function cm() {
		if (!isset($this->{__METHOD__})) {
			/** @var CreditmemoLoader $cmLoader */
			$cmLoader = df_o(CreditmemoLoader::class);
			$cmLoader->setOrderId($this->order()->getId());
			$cmLoader->setInvoiceId($this->invoice()->getId());
			$this->{__METHOD__} = $cmLoader->load();
			df_assert($this->{__METHOD__});
		}
		return $this->{__METHOD__};
	}

	/**
	 * 2016-03-27
	 * @return Invoice
	 */
	private function invoice() {
		if (!isset($this->{__METHOD__})) {
			$this->{__METHOD__} = df_invoice_by_transaction($this->order(), $this->id() . '-capture');
			df_assert($this->{__METHOD__});
		}
		return $this->{__METHOD__};
	}

	/**
	 * 2016-03-27
	 * @param string $path [optional]
	 * @return string|array(string => mixed)
	 */
	private function refund($path = null) {
		// 2016-03-25
		// null может быть ключом массива: https://3v4l.org/hWmWC
		if (!isset($this->{__METHOD__}[$path])) {
			/** @var string|mixed $result */
			$result = df_first($this->o('refunds/data'));
			$this->{__METHOD__}[$path] = df_n_set(is_null($path) ? $result : dfa_deep($result, $path));
		}
		return df_n_get($this->{__METHOD__}[$path]);
	}
}