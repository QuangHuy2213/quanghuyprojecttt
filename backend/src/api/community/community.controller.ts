import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommunityService } from './community.service';
@Controller('community')
export class CommunityController {
 constructor(private service:CommunityService){}
 @Get('posts/:id/reviews') reviews(@Param('id')id:string){return this.service.getPostReviews(Number(id));}
 @Post('posts/:id/reviews') @UseGuards(AuthGuard('jwt')) saveReview(@Req()r:any,@Param('id')id:string,@Body()b:any){return this.service.savePostReview(r.user.userId,Number(id),b);}
 @Get('my-reviews') @UseGuards(AuthGuard('jwt')) mine(@Req()r:any){return this.service.myReviews(r.user.userId);}
 @Delete('reviews/:id') @UseGuards(AuthGuard('jwt')) remove(@Req()r:any,@Param('id')id:string){return this.service.deleteReview(r.user.userId,Number(id));}
 @Get('area-reviews') areas(@Query('district')d?:string){return this.service.areaReviews(d);}
 @Post('area-reviews') @UseGuards(AuthGuard('jwt')) saveArea(@Req()r:any,@Body()b:any){return this.service.saveAreaReview(r.user.userId,b);}
 @Get('follows/:id') info(@Param('id')id:string,@Query('viewer')v?:string){return this.service.followInfo(v,id);}
 @Post('follows/:id') @UseGuards(AuthGuard('jwt')) toggle(@Req()r:any,@Param('id')id:string){return this.service.toggleFollow(r.user.userId,id);}
}
