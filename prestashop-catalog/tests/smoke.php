<?php
// Rauchtest ohne WordPress: php tests/smoke.php
define( 'ABSPATH', '/' );
define( 'MINUTE_IN_SECONDS', 60 ); define( 'DAY_IN_SECONDS', 86400 );
class WP_Error { function __construct( public $c = '', public $m = '' ) {} function get_error_message() { return $this->m; } }
function is_wp_error( $x ) { return $x instanceof WP_Error; }
function untrailingslashit( $s ) { return rtrim( $s, '/' ); }
function wp_strip_all_tags( $s ) { return strip_tags( $s ); }
function __( $s ) { return $s; }
$GLOBALS['t'] = [];
function get_transient( $k ) { return $GLOBALS['t'][ $k ] ?? false; }
function set_transient( $k, $v ) { $GLOBALS['t'][ $k ] = $v; }
require __DIR__ . '/../includes/class-psc-api.php';
require __DIR__ . '/../includes/class-psc-catalog.php';

class FakeApi extends PSC_Api {
	function __construct() { parent::__construct( 'https://shop.test', 'k' ); }
	function get( string $r, array $q = [] ) {
		if ( str_starts_with( $r, 'categories/' ) ) {
			return [ 'category' => [ 'associations' => [ 'products' => [ [ 'id' => '1' ], [ 'id' => '2' ] ] ] ] ];
		}
		if ( 'specific_prices' === $r ) {
			return [ 'specific_prices' => [ [ 'id_product' => '1', 'reduction' => '0.2', 'reduction_type' => 'percentage', 'from' => '0000-00-00 00:00:00', 'to' => '0000-00-00 00:00:00', 'id_group' => '0', 'id_customer' => '0', 'from_quantity' => '1' ] ] ];
		}
		return [ 'products' => [
			[ 'id' => 1, 'name' => [ [ 'id' => 1, 'value' => 'Mineralwasser' ] ], 'price' => '10.000000', 'id_default_image' => '5', 'link_rewrite' => [ [ 'id' => 1, 'value' => 'wasser' ] ], 'on_sale' => '0', 'date_add' => date( 'Y-m-d H:i:s' ), 'description_short' => '<p>x</p>' ],
			[ 'id' => 2, 'name' => 'Pils', 'price' => '20', 'id_default_image' => '', 'link_rewrite' => 'pils', 'on_sale' => '1', 'date_add' => '2020-01-01 00:00:00', 'description_short' => '' ],
		] ];
	}
}
$cat = new PSC_Catalog( new FakeApi, [ 'categories' => [ 12 ], 'vat' => 19, 'cache_minutes' => 5, 'new_days' => 14, 'image_type' => 'home_default' ] );
$f = fn( $c ) => is_wp_error( $cat->products( $c ) );
$items = $cat->products( 12 );
assert( $f( 99 ), 'nicht freigegebene Kategorie muss abgelehnt werden' );
assert( 2 === count( $items ) );
assert( 'Mineralwasser' === $items[0]['name'] );
assert( abs( $items[0]['old_price'] - 11.9 ) < 1e-6 && abs( $items[0]['price'] - 9.52 ) < 1e-6 );
assert( [ '-20%', 'Neu' ] === array_column( $items[0]['badges'], 'label' ) );
assert( 'https://shop.test/5-home_default/wasser.jpg' === $items[0]['image'] );
assert( [ 'Angebot' ] === array_column( $items[1]['badges'], 'label' ) && '' === $items[1]['image'] );
echo "OK\n";
