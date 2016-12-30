<?php
namespace Dfe\Stripe\Handler\Charge;
use Df\Sales\Model\Order as DfOrder;
use Df\Sales\Model\Order\Invoice as DfInvoice;
use Dfe\Stripe\Handler\Charge;
use Dfe\Stripe\Method;
use Magento\Framework\DB\Transaction;
use Magento\Framework\Exception\LocalizedException as LE;
use Magento\Sales\Model\Order\Invoice;
use Magento\Sales\Model\Order\Email\Sender\InvoiceSender;
use Magento\Sales\Model\Service\InvoiceService;
// 2016-03-25
// https://stripe.com/docs/api#event_types-charge.captured
// Occurs whenever a previously uncaptured charge is captured.
class Captured extends Charge {
	/**
	 * 2016-12-16
	 * @override
	 * @see \Dfe\Stripe\Handler\Charge::parentTransactionType()
	 * @used-by \Dfe\Stripe\Handler\Charge::id()
	 * @return string
	 */
	protected function parentTransactionType() {return 'authorize';}

	/**
	 * 2016-03-25
	 * @override
	 * Делаем по аналогии с @see \Magento\Sales\Controller\Adminhtml\Order\Invoice\Save::execute()
	 * https://github.com/magento/magento2/blob/2.1.0/app/code/Magento/Sales/Controller/Adminhtml/Order/Invoice/Save.php#L102-L235
	 * How does the backend invoicing work? https://mage2.pro/t/933
	 * @see \Dfe\Stripe\Handler::process()
	 * @used-by \Dfe\Stripe\Handler::p()
	 * @return int|string
	 */
	protected function process() {
		/** @var int|string $result */
		/**
		 * 2016-12-30
		 * Мы не должны считать исключительной ситуацией повторное получение
		 * ранее уже полученного оповещения.
		 * В документации к Stripe, например, явно сказано:
		 * «Webhook endpoints may occasionally receive the same event more than once.
		 * We advise you to guard against duplicated event receipts
		 * by making your event processing idempotent.»
		 * https://stripe.com/docs/webhooks#best-practices
		 */
		if (!$this->order()->canInvoice()) {
			$result = __('The order does not allow an invoice to be created.');
		}
		else {
			$this->order()->setIsInProcess(true);
			$this->order()->setCustomerNoteNotify(true);
			/** @var Transaction $t */
			$t = df_db_transaction();
			$t->addObject($this->invoice());
			$t->addObject($this->order());
			$t->save();
			/** @var InvoiceSender $sender */
			$sender = df_o(InvoiceSender::class);
			$sender->send($this->invoice());
			$result = $this->payment()->getId();
		}
		return $result;
	}

	/**
	 * 2016-03-26
	 * @return Invoice|DfInvoice
	 * @throws LE
	 */
	private function invoice() {return dfc($this, function() {
		/** @var InvoiceService $invoiceService */
		$invoiceService = df_o(InvoiceService::class);
		/** @var Invoice|DfInvoice $result */
		$result = $invoiceService->prepareInvoice($this->order());
		if (!$result) {
			throw new LE(__('We can\'t save the invoice right now.'));
		}
		if (!$result->getTotalQty()) {
			throw new LE(__('You can\'t create an invoice without products.'));
		}
		df_register('current_invoice', $result);
		/**
		 * 2016-03-26
		 * @used-by \Magento\Sales\Model\Order\Invoice::register()
		 * https://github.com/magento/magento2/blob/2.1.0/app/code/Magento/Sales/Model/Order/Invoice.php#L599-L609
		 * Используем именно \Magento\Sales\Model\Order\Invoice::CAPTURE_ONLINE,
		 * а не \Magento\Sales\Model\Order\Invoice::CAPTURE_OFFINE,
		 * чтобы была создана транзакция capture.
		 */
		$result->setRequestedCaptureCase(Invoice::CAPTURE_ONLINE);
		// 2016-12-16
		$this->payment()->setTransactionId(Method::txnId($this->id(), 'capture'));
		$result->register();
		return $result;
	});}
}