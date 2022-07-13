import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChainIds } from 'src/common/constants/ChainIds';
import { ParseChainIdPipe } from 'src/common/pipes/parse-chain-id.pipe';
import { ChainsService } from './chains.service';

@ApiTags('chains')
@Controller('chains')
export class ChainsController {
  constructor(
    @Inject(ChainsService) private readonly chainService: ChainsService,
  ) {}

  @Get(':chainId')
  getChainInfo(@Param('chainId', ParseChainIdPipe) chainId: ChainIds) {
    const name = this.chainService.getChainName(chainId);
    return {
      name,
      chainId,
    };
  }
}
