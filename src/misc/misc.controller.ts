import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('misc')
@Controller('misc')
export class MiscController {
  @Get('custom')
  findAllCustomResponse(@Res() response) {
    return response.status(200).send('This returned all coffee');
  }

  @Get('teapot')
  @ApiResponse({
    status: HttpStatus.I_AM_A_TEAPOT,
    description: 'Is a teapot',
  })
  @HttpCode(HttpStatus.I_AM_A_TEAPOT)
  getIsATeapot(@Body() body) {
    return body;
  }
}
