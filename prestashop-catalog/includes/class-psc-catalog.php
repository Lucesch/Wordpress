<?php
defined( 'ABSPATH' ) || exit;

/**
 * Holt Produkte einer freigegebenen Kategorie, normalisiert sie und cached das Ergebnis.
 */
class PSC_Catalog {

	private PSC_Api $api;
	private array $opt;

	public function __construct( PSC_Api $api, array $options ) {
		$this->api = $api;
		$this->opt = $options;
	}

	/** Nur freigegebene Kategorien dürfen auf der Website erscheinen. */
	public function is_allowed( int $category_id ): bool {
		return in_array( $category_id, $this->opt['categories'], true );
	}

	/** @return array|WP_Error Liste normalisierter Produkte */
	public function products( int $category_id ) {
		if ( ! $this->is_allowed( $category_id ) ) {
			return new WP_Error( 'psc_forbidden', 'Kategorie nicht freigegeben.' );
		}

		$cache_key = 'psc_cat_' . $category_id;
		$cached    = get_transient( $cache_key );
		if ( is_array( $cached ) ) {
			return $cached;
		}

		$category = $this->api->get( 'categories/' . $category_id, [ 'display' => 'full' ] );
		if ( is_wp_error( $category ) ) {
			return $category;
		}
		$cat = $category['category'] ?? ( $category['categories'][0] ?? [] );
		$ids = array_map( 'intval', array_column( $cat['associations']['products'] ?? [], 'id' ) );
		if ( ! $ids ) {
			set_transient( $cache_key, [], $this->ttl() );
			return [];
		}

		$products = [];
		foreach ( array_chunk( $ids, 100 ) as $chunk ) {
			$res = $this->api->get( 'products', [
				'display'        => '[id,name,price,id_default_image,link_rewrite,active,on_sale,date_add,description_short,reference]',
				'filter[id]'     => '[' . implode( '|', $chunk ) . ']',
				'filter[active]' => '1',
			] );
			if ( is_wp_error( $res ) ) {
				return $res;
			}
			foreach ( $res['products'] ?? [] as $p ) {
				$products[ (int) $p['id'] ] = $p;
			}
		}

		$promos = $this->promos();
		$items  = [];
		foreach ( $products as $id => $p ) {
			$items[] = $this->normalize( $p, $promos[ $id ] ?? null );
		}

		set_transient( $cache_key, $items, $this->ttl() );
		return $items;
	}

	/** Aktive Aktionspreise (specific_prices), je Produkt der beste Rabatt. */
	private function promos(): array {
		$cached = get_transient( 'psc_promos' );
		if ( is_array( $cached ) ) {
			return $cached;
		}
		$res = $this->api->get( 'specific_prices', [
			'display' => '[id_product,reduction,reduction_type,from,to,id_group,id_customer,from_quantity,id_product_attribute]',
		] );
		$out = [];
		if ( ! is_wp_error( $res ) ) {
			$now = time();
			foreach ( $res['specific_prices'] ?? [] as $sp ) {
				// Nur allgemeine Aktionen: keine Kundengruppen-/Kundenpreise, keine Staffelpreise.
				if ( (int) $sp['id_customer'] || (int) $sp['id_group'] || (int) $sp['from_quantity'] > 1 ) {
					continue;
				}
				$from = $this->ts( $sp['from'] ?? '' );
				$to   = $this->ts( $sp['to'] ?? '' );
				if ( ( $from && $from > $now ) || ( $to && $to < $now ) ) {
					continue;
				}
				$pid  = (int) $sp['id_product'];
				$red  = (float) $sp['reduction'];
				$type = (string) $sp['reduction_type'];
				if ( $red <= 0 ) {
					continue;
				}
				// Prozent gilt als "besser", wenn größer; Betrag und Prozent nicht vergleichbar -> erster gewinnt.
				if ( ! isset( $out[ $pid ] ) || ( $out[ $pid ]['type'] === $type && $red > $out[ $pid ]['reduction'] ) ) {
					$out[ $pid ] = [ 'type' => $type, 'reduction' => $red, 'to' => $to ];
				}
			}
		}
		set_transient( 'psc_promos', $out, min( $this->ttl(), 15 * MINUTE_IN_SECONDS ) );
		return $out;
	}

	private function normalize( array $p, ?array $promo ): array {
		$vat   = 1 + ( (float) $this->opt['vat'] / 100 );
		$net   = (float) $p['price'];
		$price = $net * $vat;
		$old   = null;
		$badges = [];

		if ( $promo ) {
			$old = $price;
			if ( 'percentage' === $promo['type'] ) {
				$price = $old * ( 1 - $promo['reduction'] );
				$badges[] = [ 'class' => 'promo', 'label' => sprintf( '-%d%%', round( $promo['reduction'] * 100 ) ) ];
			} else {
				// Fester Betrag: laut PrestaShop-Standard (reduction_tax=1) inkl. Steuer.
				$price = max( 0, $old - $promo['reduction'] );
				$badges[] = [ 'class' => 'promo', 'label' => __( 'Aktion', 'ps-catalog' ) ];
			}
		} elseif ( (int) ( $p['on_sale'] ?? 0 ) ) {
			$badges[] = [ 'class' => 'sale', 'label' => __( 'Angebot', 'ps-catalog' ) ];
		}

		$added = $this->ts( $p['date_add'] ?? '' );
		if ( $added && $added > time() - (int) $this->opt['new_days'] * DAY_IN_SECONDS ) {
			$badges[] = [ 'class' => 'new', 'label' => __( 'Neu', 'ps-catalog' ) ];
		}

		$name = $this->lang( $p['name'] ?? '' );
		$rw   = $this->lang( $p['link_rewrite'] ?? '' );
		$img  = (int) ( $p['id_default_image'] ?? 0 );
		$base = $this->api->shop_url();

		return [
			'id'        => (int) $p['id'],
			'name'      => $name,
			'excerpt'   => wp_strip_all_tags( $this->lang( $p['description_short'] ?? '' ) ),
			'price'     => $price,
			'old_price' => $old,
			'image'     => $img ? sprintf( '%s/%d-%s/%s.jpg', $base, $img, $this->opt['image_type'], $rw ?: 'produkt' ) : '',
			'url'       => $base . '/index.php?controller=product&id_product=' . (int) $p['id'],
			'badges'    => $badges,
		];
	}

	/** Mehrsprachige Felder: [ ['id'=>1,'value'=>'..'], ... ] oder String. */
	private function lang( $field ): string {
		if ( is_array( $field ) ) {
			$first = $field[0]['value'] ?? '';
			return (string) $first;
		}
		return (string) $field;
	}

	private function ts( string $date ): int {
		if ( '' === $date || str_starts_with( $date, '0000' ) ) {
			return 0;
		}
		$t = strtotime( $date );
		return $t ?: 0;
	}

	private function ttl(): int {
		return max( 1, (int) $this->opt['cache_minutes'] ) * MINUTE_IN_SECONDS;
	}

	public static function flush(): void {
		global $wpdb;
		$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\_transient\_psc\_%' OR option_name LIKE '\_transient\_timeout\_psc\_%'" );
	}
}
