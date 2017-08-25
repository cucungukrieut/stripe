<?php
namespace Dfe\Stripe\Block;
use Magento\Framework\View\Element\AbstractBlock as _P;
/**
 * 2017-08-25
 * @final Unable to use the PHP «final» keyword here because of the M2 code generation.
 * @used-by \Df\Payment\Method::getFormBlockType()
 * @method \Dfe\Stripe\Method m()
 * @method \Dfe\Stripe\Settings s()
 */
class Multishipping extends \Df\Payment\Block\Multishipping {
 	/**
	 * 2017-08-25
	 * @override
	 * @see _P::_toHtml()
	 * @used-by _P::toHtml():
	 *		$html = $this->_loadCache();
	 *		if ($html === false) {
	 *			if ($this->hasData('translate_inline')) {
	 *				$this->inlineTranslation->suspend($this->getData('translate_inline'));
	 *			}
	 *			$this->_beforeToHtml();
	 *			$html = $this->_toHtml();
	 *			$this->_saveCache($html);
	 *			if ($this->hasData('translate_inline')) {
	 *				$this->inlineTranslation->resume();
	 *			}
	 *		}
	 *		$html = $this->_afterToHtml($html);
	 * https://github.com/magento/magento2/blob/2.2.0-RC1.6/lib/internal/Magento/Framework/View/Element/AbstractBlock.php#L642-L683
	 * @return string|null
	 */
	final protected function _toHtml() {$m = $this->m(); return df_cc_n(
		df_tag('div',
			['class' => df_module_name_lc($m, '-')] + df_widget($m, 'multishipping', [
				'key' => $this->s()->publicKey()
			])
			,df_block_output($m, 'multishipping')
		)
		,df_link_inline(df_asset_name('multishipping', $m, 'css'))
	);}
}