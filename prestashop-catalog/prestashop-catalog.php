<?php
/**
 * Plugin Name: PrestaShop Catalog
 * Description: Zeigt ausgewählte Kategorien (z. B. Wasser, Bier) aus dem PrestaShop-Artikelkatalog per Shortcode an – inkl. Aktions-Störern.
 * Version:     0.1.0
 * Requires at least: 6.0
 * Requires PHP: 8.0
 * Text Domain: ps-catalog
 */

defined( 'ABSPATH' ) || exit;

define( 'PSC_VERSION', '0.1.0' );
define( 'PSC_DIR', plugin_dir_path( __FILE__ ) );
define( 'PSC_URL', plugin_dir_url( __FILE__ ) );

require_once PSC_DIR . 'includes/class-psc-api.php';
require_once PSC_DIR . 'includes/class-psc-catalog.php';
require_once PSC_DIR . 'includes/class-psc-settings.php';
require_once PSC_DIR . 'includes/class-psc-shortcode.php';

add_action( 'plugins_loaded', static function () {
	PSC_Settings::init();
	PSC_Shortcode::init();
} );
