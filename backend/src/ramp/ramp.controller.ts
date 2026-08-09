import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { RampService } from './ramp.service';

@Controller('api/ramp')
export class RampController {
  constructor(private readonly rampService: RampService) {}

  /**
   * POST /api/ramp/quote
   * Body: { fiatCurrency, cryptoCurrency, isBuyOrSell, network, paymentMethod,
   *         fiatAmount?, cryptoAmount? }
   * Returns a quoteToken and pricing details.
   */
  @Post('quote')
  async quote(@Body() body: Record<string, unknown>) {
    return this.rampService.quote(body);
  }

  /**
   * POST /api/ramp/widget
   * Body: { quoteToken, wallet: { address, chain }, email?, userIp? }
   * Returns { orderId, widgetUrl }.
   */
  @Post('widget')
  async widget(@Body() body: Record<string, unknown>) {
    return this.rampService.createWidget(body);
  }

  /**
   * GET /api/ramp/order/:orderId
   * Returns ramp order status — polled by the frontend until status = COMPLETED.
   */
  @Get('order/:orderId')
  async order(@Param('orderId') orderId: string) {
    return this.rampService.order(orderId);
  }

  /**
   * GET /api/ramp/payment-methods?fiatCurrency=USD
   * Returns available payment method IDs for the given fiat currency.
   */
  @Get('payment-methods')
  async paymentMethods(@Query('fiatCurrency') fiatCurrency?: string) {
    return this.rampService.paymentMethods(fiatCurrency ?? 'USD');
  }
}
