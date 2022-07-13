import { Injectable } from '@nestjs/common';
import { ChainIds } from '../common/constants/ChainIds';

@Injectable()
export class ChainsService {
  getChainName(chainId: ChainIds) {
    return Object.entries(ChainIds).find((x) => x[1] === chainId)[0];
  }
}
