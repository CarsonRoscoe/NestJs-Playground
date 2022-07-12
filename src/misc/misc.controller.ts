import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';

@Controller('misc')
export class MiscController {
  @Get('custom')
  findAllCustomResponse(@Res() response) {
    return response.status(200).send('This returned all coffee');
  }

  @Get('teapot')
  @HttpCode(HttpStatus.I_AM_A_TEAPOT)
  getIsATeapot(@Body() body) {
    return body;
  }
}
