<?php
defined( 'ABSPATH' ) || exit;

class PSC_Settings {

	const OPTION = 'psc_options';

	public static function init(): void {
		add_action( 'admin_menu', [ __CLASS__, 'menu' ] );
		add_action( 'admin_init', [ __CLASS__, 'register' ] );
		add_action( 'admin_post_psc_flush', [ __CLASS__, 'handle_flush' ] );
	}

	public static function get(): array {
		$o = wp_parse_args( get_option( self::OPTION, [] ), [
			'shop_url'      => '',
			'api_key'       => '',
			'categories'    => '',
			'vat'           => 19,
			'cache_minutes' => 60,
			'new_days'      => 14,
			'image_type'    => 'home_default',
		] );
		$o['categories'] = array_values( array_filter( array_map( 'intval', preg_split( '/[\s,;]+/', (string) $o['categories'] ) ) ) );
		return $o;
	}

	public static function menu(): void {
		add_options_page( 'PrestaShop Catalog', 'PrestaShop Catalog', 'manage_options', 'psc', [ __CLASS__, 'page' ] );
	}

	public static function register(): void {
		register_setting( 'psc', self::OPTION, [ 'sanitize_callback' => [ __CLASS__, 'sanitize' ] ] );
	}

	public static function sanitize( $in ): array {
		$in  = is_array( $in ) ? $in : [];
		$old = get_option( self::OPTION, [] );
		PSC_Catalog::flush();
		return [
			'shop_url'      => esc_url_raw( trim( $in['shop_url'] ?? '' ) ),
			// Leeres Feld = bestehenden Key behalten.
			'api_key'       => '' !== trim( $in['api_key'] ?? '' ) ? sanitize_text_field( $in['api_key'] ) : ( $old['api_key'] ?? '' ),
			'categories'    => implode( ',', array_filter( array_map( 'intval', preg_split( '/[\s,;]+/', (string) ( $in['categories'] ?? '' ) ) ) ) ),
			'vat'           => max( 0, min( 100, (float) ( $in['vat'] ?? 19 ) ) ),
			'cache_minutes' => max( 1, (int) ( $in['cache_minutes'] ?? 60 ) ),
			'new_days'      => max( 0, (int) ( $in['new_days'] ?? 14 ) ),
			'image_type'    => sanitize_key( $in['image_type'] ?? 'home_default' ) ?: 'home_default',
		];
	}

	public static function handle_flush(): void {
		check_admin_referer( 'psc_flush' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( 'Keine Berechtigung.' );
		}
		PSC_Catalog::flush();
		wp_safe_redirect( add_query_arg( 'psc_flushed', 1, admin_url( 'options-general.php?page=psc' ) ) );
		exit;
	}

	public static function page(): void {
		$cur = self::get();
		?>
		<div class="wrap">
			<h1>PrestaShop Catalog</h1>
			<?php if ( isset( $_GET['psc_flushed'] ) ) : ?>
				<div class="notice notice-success"><p>Cache geleert.</p></div>
			<?php endif; ?>
			<form method="post" action="options.php">
				<?php settings_fields( 'psc' ); ?>
				<table class="form-table">
					<tr><th>Shop-URL</th><td><input class="regular-text" type="url" name="<?php echo self::OPTION; ?>[shop_url]" value="<?php echo esc_attr( $cur['shop_url'] ); ?>" placeholder="https://shop.example.de"></td></tr>
					<tr><th>Webservice-Key</th><td><input class="regular-text" type="password" autocomplete="new-password" name="<?php echo self::OPTION; ?>[api_key]" placeholder="<?php echo $cur['api_key'] ? '(gespeichert – leer lassen zum Behalten)' : ''; ?>"><p class="description">Nur Leserechte (GET) auf products, categories, specific_prices.</p></td></tr>
					<tr><th>Freigegebene Kategorie-IDs</th><td><input class="regular-text" type="text" name="<?php echo self::OPTION; ?>[categories]" value="<?php echo esc_attr( implode( ', ', $cur['categories'] ) ); ?>" placeholder="12, 15"><p class="description">Nur diese Kategorien (z. B. Wasser, Bier) können auf der Website angezeigt werden. IDs findest du im PrestaShop-Backend unter Katalog → Kategorien.</p></td></tr>
					<tr><th>MwSt.-Satz (%)</th><td><input type="number" step="0.1" name="<?php echo self::OPTION; ?>[vat]" value="<?php echo esc_attr( $cur['vat'] ); ?>"><p class="description">Die API liefert Netto-Preise; Anzeige = Netto × (1 + Satz).</p></td></tr>
					<tr><th>Cache (Minuten)</th><td><input type="number" min="1" name="<?php echo self::OPTION; ?>[cache_minutes]" value="<?php echo esc_attr( $cur['cache_minutes'] ); ?>"></td></tr>
					<tr><th>„Neu“-Störer (Tage)</th><td><input type="number" min="0" name="<?php echo self::OPTION; ?>[new_days]" value="<?php echo esc_attr( $cur['new_days'] ); ?>"><p class="description">Artikel, die jünger sind, bekommen einen „Neu“-Störer. 0 = aus.</p></td></tr>
					<tr><th>Bildformat</th><td><input type="text" name="<?php echo self::OPTION; ?>[image_type]" value="<?php echo esc_attr( $cur['image_type'] ); ?>"><p class="description">PrestaShop-Bildtyp, z. B. home_default, medium_default, large_default.</p></td></tr>
				</table>
				<?php submit_button(); ?>
			</form>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="psc_flush">
				<?php wp_nonce_field( 'psc_flush' ); submit_button( 'Cache jetzt leeren', 'secondary' ); ?>
			</form>
			<h2>Verwendung</h2>
			<p><code>[ps_catalog category="12" limit="12" columns="4"]</code> – <code>orderby</code>: <code>name</code> (Standard), <code>price</code>, <code>promo</code> (Aktionen zuerst). <code>only_promo="1"</code> zeigt nur Aktionsartikel.</p>
		</div>
		<?php
	}
}
