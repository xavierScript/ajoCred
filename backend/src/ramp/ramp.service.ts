import { Injectable } from '@nestjs/common';
import { CleanverseClientService } from '../common/cleanverse/cleanverse-client.service';

@Injectable()
export class RampService {
  constructor(private readonly cleanverse: CleanverseClientService) {}

  /**
   * Fetch a live fiat<->crypto quote via `query_ramp_quote`.
   * Body shape: { fiatCurrency, cryptoCurrency, isBuyOrSell (BUY|SELL),
   *   network, paymentMethod, fiatAmount?, cryptoAmount? }
   * Returns a quoteToken (short-lived JWT) and pricing breakdown.
   */
  async quote(params: unknown): Promise<unknown> {
    return this.cleanverse.postPlain('/query_ramp_quote', params);
  }

  /**
   * Create a hosted ramp widget URL via `create_ramp_widget_url`.
   * Body shape: { quoteToken, wallet: { address, chain }, email?, userIp? }
   * Returns { orderId, widgetUrl }.
   */
  async createWidget(params: unknown): Promise<unknown> {
    return this.cleanverse.postPlain('/create_ramp_widget_url', params);
  }

  /**
   * Poll a ramp order status via `query_ramp_order`.
   * orderId is the value returned by createWidget().
   */
  async order(orderId: string): Promise<unknown> {
    return this.cleanverse.postPlain('/query_ramp_order', { orderId });
  }

  /**
   * List available payment methods via `query_ramp_payment_methods`.
   * fiatCurrency defaults to "USD".
   */
  async paymentMethods(fiatCurrency = 'USD'): Promise<unknown> {
    return this.cleanverse.postPlain('/query_ramp_payment_methods', {
      fiatCurrency,
    });
  }
}
