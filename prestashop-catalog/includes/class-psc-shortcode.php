<?php
defined( 'ABSPATH' ) || exit;

class PSC_Shortcode {

	public static function init(): void {
		add_shortcode( 'ps_catalog', [ __CLASS__, 'render' ] );
		add_action( 'wp_enqueue_scripts', static function () {
			wp_register_style( 'psc', PSC_URL . 'assets/style.css', [], PSC_VERSION );
		} );
	}

	public static function render( $atts ): string {
		$a = shortcode_atts( [
			'category'   => 0,
			'limit'      => 12,
			'columns'    => 4,
			'orderby'    => 'name',
			'only_promo' => 0,
		], $atts, 'ps_catalog' );

		$opt = PSC_Settings::get();
		$api = new PSC_Api( $opt['shop_url'], $opt['api_key'] );
		if ( ! $api->is_configured() ) {
			return self::notice( 'PrestaShop Catalog ist noch nicht konfiguriert.' );
		}

		$items = ( new PSC_Catalog( $api, $opt ) )->products( (int) $a['category'] );
		if ( is_wp_error( $items ) ) {
			// Besucher sehen nichts Technisches; Admins bekommen den Grund.
			return self::notice( $items->get_error_message() );
		}

		if ( (int) $a['only_promo'] ) {
			$items = array_filter( $items, static fn( $i ) => null !== $i['old_price'] );
		}
		switch ( $a['orderby'] ) {
			case 'price':
				usort( $items, static fn( $x, $y ) => $x['price'] <=> $y['price'] );
				break;
			case 'promo':
				usort( $items, static fn( $x, $y ) => [ null === $x['old_price'], $x['name'] ] <=> [ null === $y['old_price'], $y['name'] ] );
				break;
			default:
				usort( $items, static fn( $x, $y ) => strcasecmp( $x['name'], $y['name'] ) );
		}
		$items = array_slice( array_values( $items ), 0, max( 1, (int) $a['limit'] ) );
		if ( ! $items ) {
			return '';
		}

		wp_enqueue_style( 'psc' );
		$cols = max( 1, min( 6, (int) $a['columns'] ) );

		ob_start();
		echo '<div class="psc-grid" style="--psc-cols:' . (int) $cols . '">';
		foreach ( $items as $i ) {
			echo '<a class="psc-card" href="' . esc_url( $i['url'] ) . '" target="_blank" rel="noopener">';
			echo '<span class="psc-badges">';
			foreach ( $i['badges'] as $b ) {
				echo '<span class="psc-badge psc-badge--' . esc_attr( $b['class'] ) . '">' . esc_html( $b['label'] ) . '</span>';
			}
			echo '</span>';
			if ( $i['image'] ) {
				echo '<img src="' . esc_url( $i['image'] ) . '" alt="' . esc_attr( $i['name'] ) . '" loading="lazy">';
			}
			echo '<span class="psc-name">' . esc_html( $i['name'] ) . '</span>';
			echo '<span class="psc-price">';
			if ( null !== $i['old_price'] ) {
				echo '<del>' . esc_html( self::money( $i['old_price'] ) ) . '</del> ';
			}
			echo '<strong>' . esc_html( self::money( $i['price'] ) ) . '</strong></span>';
			echo '</a>';
		}
		echo '</div>';
		return (string) ob_get_clean();
	}

	private static function money( float $v ): string {
		return number_format_i18n( $v, 2 ) . ' €';
	}

	private static function notice( string $msg ): string {
		return current_user_can( 'manage_options' ) ? '<p class="psc-notice">' . esc_html( $msg ) . '</p>' : '';
	}
}
