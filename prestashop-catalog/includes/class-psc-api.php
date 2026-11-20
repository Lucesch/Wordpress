<?php
defined( 'ABSPATH' ) || exit;

/**
 * Schlanker Client für die PrestaShop-Webservice-API (JSON, Basic Auth).
 * Der API-Key bleibt serverseitig und gelangt nie ins Frontend.
 */
class PSC_Api {

	private string $base;
	private string $key;

	public function __construct( string $shop_url, string $api_key ) {
		$this->base = untrailingslashit( $shop_url );
		$this->key  = $api_key;
	}

	public function is_configured(): bool {
		return $this->base !== '' && $this->key !== '';
	}

	public function shop_url(): string {
		return $this->base;
	}

	/**
	 * @param string $resource z. B. "products"
	 * @param array  $query    Query-Parameter (filter[...], display, limit ...)
	 * @return array|WP_Error  Dekodierte JSON-Antwort
	 */
	public function get( string $resource, array $query = [] ) {
		$query['output_format'] = 'JSON';
		$url                    = $this->base . '/api/' . ltrim( $resource, '/' ) . '?' . $this->build_query( $query );

		$response = wp_remote_get( $url, [
			'timeout' => 15,
			'headers' => [
				'Authorization' => 'Basic ' . base64_encode( $this->key . ':' ),
				'Accept'        => 'application/json',
			],
		] );

		if ( is_wp_error( $response ) ) {
			return $response;
		}
		$code = wp_remote_retrieve_response_code( $response );
		if ( 200 !== $code ) {
			return new WP_Error( 'psc_http', sprintf( 'PrestaShop-API antwortete mit HTTP %d', $code ) );
		}
		$data = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( ! is_array( $data ) ) {
			// Leere Treffermenge liefert bei PrestaShop teils "[]" oder einen leeren Body.
			return [];
		}
		return $data;
	}

	/** PrestaShop erwartet Klammern und "|" unkodiert in filter[...]=[a|b]. */
	private function build_query( array $query ): string {
		$parts = [];
		foreach ( $query as $k => $v ) {
			$parts[] = str_replace( [ '%5B', '%5D', '%7C' ], [ '[', ']', '|' ], rawurlencode( (string) $k ) )
				. '=' . str_replace( [ '%5B', '%5D', '%7C', '%2C' ], [ '[', ']', '|', ',' ], rawurlencode( (string) $v ) );
		}
		return implode( '&', $parts );
	}
}
