import {
  ArgumentMetadata,
  HttpException,
  HttpStatus,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { ChainIds } from '../constants/ChainIds';

@Injectable()
export class ParseChainIdPipe implements PipeTransform {
  transform(value: string, metadata: ArgumentMetadata) {
    const valueAsNumber = parseInt(value);

    if (isNaN(valueAsNumber)) {
      throw new HttpException(
        `${value} is not a valid chainId`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const hasValue = Object.values(ChainIds).includes(valueAsNumber);

    if (!hasValue) {
      throw new HttpException(
        `${valueAsNumber} is not a supported chainId`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return value;
  }
}
