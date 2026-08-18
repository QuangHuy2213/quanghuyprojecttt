import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async getAllPosts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('city') city?: string,
    @Query('district') district?: string,
    @Query('keyword') keyword?: string,
    @Query('price') price?: string,
    @Query('area') area?: string,
  ) {
    const pageNumber = page ? Number(page) : 1;
    const limitNumber = limit ? Number(limit) : 8;
    
    return this.postsService.findAllPosts(
      pageNumber, 
      limitNumber, 
      city, 
      district, 
      keyword, 
      price, 
      area
    );
  }

  @Get(':id')
  async getPostById(@Param('id') id: string) {
    return this.postsService.findOnePost(Number(id));
  }

  @Post()
  async createNewPost(@Body() body: any) {
    return this.postsService.createPost(body);
  }

  @Post(':id/favorite')
  async toggleFavorite(
    @Param('id') postId: string,
    @Body('userId') userId: string,
  ) {
    return this.postsService.toggleFavorite(userId, Number(postId));
  }

  @Get('favorites/:userId')
  async getFavorites(@Param('userId') userId: string) {
    return this.postsService.getUserFavorites(userId);
  }

  @Get('user/:userId')
  async getPostsByUser(@Param('userId') userId: string) {
    return this.postsService.findPostsByUser(userId);
  }

  @Post(':id/delete')
  async deletePost(
    @Param('id') postId: string,
    @Body('userId') userId: string,
  ) {
    return this.postsService.deletePost(Number(postId), userId);
  }

  @Patch(':id')
  async updatePost(
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.postsService.updatePost(Number(id), data.userId, data);
  }
}